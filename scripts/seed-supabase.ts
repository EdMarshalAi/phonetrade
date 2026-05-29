/**
 * Заливает каталог (CATEGORIES, ALL_PRODUCTS) из src/lib/data/products.ts
 * в Supabase. Идемпотентно (upsert). Источник истины — мок-данные.
 *
 * Запуск: npm run seed
 * Нужны в .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ALL_PRODUCTS, CATEGORIES } from "@/lib/data/products";
import { productToRow, categoryToRow } from "@/lib/supabase/types";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const catRows = CATEGORIES.map((c, i) => categoryToRow(c, i));
  const c = await db.from("categories").upsert(catRows, { onConflict: "slug" });
  if (c.error) throw c.error;
  console.log(`OK categories: ${catRows.length}`);

  const prodRows = ALL_PRODUCTS.map((p, i) => productToRow(p, i));
  const p = await db.from("products").upsert(prodRows, { onConflict: "id" });
  if (p.error) throw p.error;
  console.log(`OK products: ${prodRows.length}`);

  const { count } = await db.from("products").select("*", { count: "exact", head: true });
  console.log(`OK products in DB now: ${count}`);
}

main()
  .then(() => console.log("Готово."))
  .catch((e) => {
    console.error("Ошибка сида:", e.message ?? e);
    process.exit(1);
  });
