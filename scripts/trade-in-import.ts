/**
 * Импорт реальных базовых цен trade-in от владельца в trade_in_base_prices.
 * Источник: /Users/admin/Downloads/phonetrade-trade-in-prices.json (58 позиций).
 * Запуск: npx tsx scripts/trade-in-import.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

type Price = {
  model_key: string;
  model_title: string;
  memory_gb: number;
  base_price_rub: number;
  is_active: boolean;
  notes: string;
  display_order: number;
};

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const json = JSON.parse(readFileSync("/Users/admin/Downloads/phonetrade-trade-in-prices.json", "utf8")) as { prices: Price[] };
  const rows = json.prices.map((p) => ({
    model_key: p.model_key,
    model_title: p.model_title,
    memory_gb: p.memory_gb,
    base_price_rub: p.base_price_rub,
    is_active: p.is_active ?? true,
    notes: p.notes ?? null,
    display_order: p.display_order ?? 0,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from("trade_in_base_prices").upsert(rows, { onConflict: "model_key,memory_gb" });
  if (error) {
    console.error("✗ upsert:", error.message);
    process.exit(1);
  }
  const { count } = await db.from("trade_in_base_prices").select("id", { count: "exact", head: true });
  console.log(`✓ Импортировано позиций: ${rows.length}. Всего в таблице: ${count}.`);
}

main().then(() => process.exit(0));
