/**
 * Переназначает SKU всем товарам по формуле PH{код категории}-{уникальный номер}.
 * Номер — глобально уникальный (последовательный), поэтому повторов нет.
 * Запуск: npx tsx scripts/regenerate-skus.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* optional */ }
}
function skuCategoryCode(slug: string | null): string {
  const s = (slug || "x").toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 900;
  return String(100 + h);
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: prods, error } = await db
    .from("products")
    .select("id, category_slug")
    .is("deleted_at", null)
    .order("category_slug")
    .order("id")
    .limit(5000);
  if (error) throw error;
  const list = prods ?? [];

  let n = 1001;
  let ok = 0;
  for (const p of list) {
    const sku = `PH${skuCategoryCode(p.category_slug as string)}-${n}`;
    const { error: e2 } = await db.from("products").update({ sku, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (e2) throw e2;
    n++;
    ok++;
  }
  console.log(`SKU обновлены: ${ok}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
