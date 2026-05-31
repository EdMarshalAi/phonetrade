import { NextResponse } from "next/server";
import { refreshAndStoreCbr } from "@/lib/pricing/cbr";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyTelegram } from "@/lib/admin/telegram";

export const dynamic = "force-dynamic";

/**
 * Ежечасное обновление курса ЦБ (вызывается внешним планировщиком — GitHub Actions).
 * Защита: заголовок `x-cron-secret` или `?secret=` должен совпасть с CRON_SECRET.
 * Если включён авто-курс (use_cbr_auto) и скачок ≤5% — обновляет рабочий курс и
 * пересчитывает цены. При скачке >5% — только сохраняет курс и шлёт алёрт.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
  const db = createSupabaseAdminClient();

  // Секрет берём из env (если задан) ИЛИ из БД (shop_settings.cron_secret) —
  // последнее позволяет хранить его в Supabase, без правки env на сервере.
  let expected = process.env.CRON_SECRET || null;
  if (!expected) {
    const { data } = await db.from("shop_settings").select("value").eq("key", "cron_secret").maybeSingle();
    const v = data?.value as { secret?: string } | string | null;
    expected = typeof v === "string" ? v : v?.secret ?? null;
  }
  if (!expected) return NextResponse.json({ error: "cron secret not configured" }, { status: 503 });
  if (!provided || provided !== expected) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const rates = await refreshAndStoreCbr();
    const { data: settings } = await db.from("pricing_settings").select("*").eq("id", 1).maybeSingle();

    let recalculated = 0;
    let workingRateUpdated = false;

    if (settings?.use_cbr_auto) {
      if (rates.bigChange) {
        try {
          await notifyTelegram(
            "cbr_rate_big_change",
            `📊 Курс ЦБ изменился более чем на 5% за сутки (был ${rates.prevUsd} → стал ${rates.usd}). ` +
              `Авто-обновление рабочего курса приостановлено — проверьте прайс вручную.`
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
      await notifyTelegram("cbr_rate_fetch_failed", "❌ Не удалось получить курс ЦБ. Проверьте интеграцию прайса.");
    } catch {}
    return NextResponse.json({ error: e instanceof Error ? e.message : "fetch failed" }, { status: 502 });
  }
}
