import { NextResponse } from "next/server";
import { refreshAndStoreCbr } from "@/lib/pricing/cbr";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTelegram, telegramRecipientsFor } from "@/lib/admin/telegram";

export const dynamic = "force-dynamic";

/**
 * Ежечасное обновление курса ЦБ (вызывается внешним планировщиком — GitHub Actions).
 * Защита: заголовок `x-cron-secret` или `?secret=` должен совпасть с CRON_SECRET.
 * Если включён авто-курс (use_cbr_auto) и скачок ≤5% — обновляет рабочий курс и
 * пересчитывает цены. При скачке >5% — только сохраняет курс и шлёт алёрт.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const url = new URL(req.url);
  const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
  if (provided !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const rates = await refreshAndStoreCbr();
    const db = createSupabaseAdminClient();
    const { data: settings } = await db.from("pricing_settings").select("*").eq("id", 1).maybeSingle();

    let recalculated = 0;
    let workingRateUpdated = false;

    if (settings?.use_cbr_auto) {
      if (rates.bigChange) {
        try {
          const chats = await telegramRecipientsFor("cbr_rate_big_change");
          await sendTelegram(
            `📊 Курс ЦБ изменился более чем на 5% за сутки (был ${rates.prevUsd} → стал ${rates.usd}). ` +
              `Авто-обновление рабочего курса приостановлено — проверьте прайс вручную.`,
            chats.length ? chats : undefined
          );
        } catch {}
      } else {
        const working = +(rates.usd * (1 + (settings.cbr_markup_percent ?? 0) / 100)).toFixed(4);
        await db.from("pricing_settings").update({ working_usd_rate: working, updated_at: new Date().toISOString() }).eq("id", 1);
        workingRateUpdated = true;
        const { data: cnt } = await db.rpc("recalculate_all_prices", { p_reason: "fx_recalc", p_user_id: null });
        recalculated = typeof cnt === "number" ? cnt : 0;
      }
    }

    return NextResponse.json({ ok: true, usd: rates.usd, eur: rates.eur, date: rates.date, bigChange: rates.bigChange, workingRateUpdated, recalculated });
  } catch (e) {
    try {
      const chats = await telegramRecipientsFor("cbr_rate_fetch_failed");
      await sendTelegram("❌ Не удалось получить курс ЦБ. Проверьте интеграцию прайса.", chats.length ? chats : undefined);
    } catch {}
    return NextResponse.json({ error: e instanceof Error ? e.message : "fetch failed" }, { status: 502 });
  }
}
