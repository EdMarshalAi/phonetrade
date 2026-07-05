/**
 * Публикует гео-страницы ремонта по городам области (программатик услуга×город)
 * в static_pages. Отдаются катч-оллом (site)/[slug]. Идемпотентно (upsert по slug).
 * Запуск: npx tsx scripts/seo-remont-goroda-2026-07.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SCRATCH = "/private/tmp/claude-501/-Users-admin-PhoneTrade/9d8f3033-8b1f-44a7-93d6-566f5bf6aef6/scratchpad";

type Page = { slug: string; title: string; meta_title: string; meta_description: string; content_html: string; status: string };

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const pages: Page[] = JSON.parse(readFileSync(`${SCRATCH}/remont-goroda.json`, "utf8"));
  let ok = 0;
  for (const p of pages) {
    const row = { slug: p.slug, title: p.title, content: p.content_html, meta_title: p.meta_title, meta_description: p.meta_description, status: "published", updated_at: now };
    const { data: ex } = await db.from("static_pages").select("id").eq("slug", p.slug).maybeSingle();
    if (ex?.id) {
      const { error } = await db.from("static_pages").update(row).eq("id", ex.id);
      if (error) { console.warn("upd fail", p.slug, error.message); continue; }
      console.log(`↻ ${p.slug}`);
    } else {
      const { error } = await db.from("static_pages").insert({ id: randomUUID(), ...row });
      if (error) { console.warn("ins fail", p.slug, error.message); continue; }
      console.log(`✓ ${p.slug}`);
    }
    ok++;
  }
  console.log(`\nОпубликовано гео-страниц ремонта: ${ok}/${pages.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
