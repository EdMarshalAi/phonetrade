/**
 * Переносит существующий SEO-блок категорий (из category-config.ts) в БД
 * (categories.seo_text как HTML) — чтобы редактировался из админки и был
 * единственным источником нижнего SEO-текста на странице категории.
 * Идемпотентно. Запуск: npm run seed:category-seo
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_CONFIGS } from "@/lib/catalog/category-config";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, key, { auth: { persistSession: false } });

  let n = 0;
  for (const [slug, config] of Object.entries(CATEGORY_CONFIGS)) {
    const blocks = config.seo;
    if (!blocks || blocks.length === 0) continue;
    const html = blocks
      .map((b) => {
        if (b.html) return b.html;
        const h = b.heading ? `<h2>${esc(b.heading)}</h2>` : "";
        const ps = (b.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join("");
        return h + ps;
      })
      .join("");
    if (!html) continue;
    const { error } = await db.from("categories").update({ seo_text: html, updated_at: new Date().toISOString() }).eq("slug", slug);
    if (error) console.error(`  ! ${slug}: ${error.message}`);
    else {
      n++;
      console.log(`OK ${slug}: SEO-текст (${html.length} симв.)`);
    }
  }
  console.log(`\nГотово. Обновлено категорий: ${n}.`);
}

main().catch((e) => {
  console.error("Ошибка seed-category-seo:", e.message ?? e);
  process.exit(1);
});
