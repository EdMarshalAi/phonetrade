import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processEmailQueue } from "@/lib/email/process-queue";
import { processScheduledCampaigns } from "@/lib/email/send-campaign";
import { detectAbandonedCarts } from "@/lib/email/abandoned-carts";

export const dynamic = "force-dynamic";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Обработка очереди отложенных писем. Вызывается внешним планировщиком
 * (cron-job.org → раз в минуту). Защита: `x-cron-secret` или `?secret=` ==
 * CRON_SECRET (env или shop_settings.cron_secret).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
  const db = createSupabaseAdminClient();

  let expected = process.env.CRON_SECRET || null;
  if (!expected) {
    const { data } = await db.from("shop_settings").select("value").eq("key", "cron_secret").maybeSingle();
    const v = data?.value as { secret?: string } | string | null;
    expected = typeof v === "string" ? v : v?.secret ?? null;
  }
  if (!expected) return NextResponse.json({ error: "cron secret not configured" }, { status: 503 });
  if (!secretMatches(provided, expected)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const carts = await detectAbandonedCarts();
    const res = await processEmailQueue(25);
    const camp = await processScheduledCampaigns();
    return NextResponse.json({ ok: true, ...res, campaigns: camp.processed, abandonedCarts: carts.detected });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "queue processing failed" }, { status: 500 });
  }
}
