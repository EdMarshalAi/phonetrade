/**
 * Применяет сгенерированные HTML-описания (/tmp/seo-out-*.json) ко всем товарам
 * групп (/tmp/seo-models.json) → products.description_html. Запуск: npx tsx scripts/seo-apply.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() { const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8"); for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } }

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const groups = JSON.parse(readFileSync("/tmp/seo-models.json", "utf8")) as any[];
  const htmlByKey = new Map<string, string>();
  for (let i = 1; i <= 5; i++) {
    try {
      const arr = JSON.parse(readFileSync(`/tmp/seo-out-${i}.json`, "utf8")) as any[];
      for (const r of arr) if (r.key && r.html) htmlByKey.set(r.key, String(r.html));
    } catch (e) { console.warn("skip out", i, (e as Error).message); }
  }
  console.log("HTML получено для ключей:", htmlByKey.size, "/ групп:", groups.length);

  let updated = 0; const missing: string[] = [];
  for (const g of groups) {
    const html = htmlByKey.get(g.key);
    if (!html) { missing.push(g.key); continue; }
    const now = new Date().toISOString();
    // батч-апдейт по ids
    for (let i = 0; i < g.ids.length; i += 50) {
      const chunk = g.ids.slice(i, i + 50);
      const { error } = await db.from("products").update({ description_html: html, updated_at: now }).in("id", chunk);
      if (error) { console.warn("upd err", g.key, error.message); continue; }
      updated += chunk.length;
    }
  }
  console.log(`description_html проставлено товарам: ${updated}. Групп без HTML: ${missing.length}`);
  if (missing.length) console.log("Нет HTML для:", missing.join(", "));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
