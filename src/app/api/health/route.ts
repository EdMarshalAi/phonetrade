import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Health-check для внешнего мониторинга доступности (GitHub Actions uptime).
 * 200 — сайт и БД живы; 503 — БД недоступна. Лёгкий запрос (одна строка).
 */
export async function GET() {
  try {
    const db = createSupabaseAdminClient();
    const { error } = await db.from("shop_settings").select("key").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
