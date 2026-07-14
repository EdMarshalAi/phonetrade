/**
 * Публикует статьи-кластеры (наушники/часы/ноутбук/сравнения/PS5) из JSON,
 * подготовленных субагентами. Обложки — из фото товара coverCategory, старт-
 * просмотры не подделывает. Идемпотентно (upsert по slug).
 * Запуск: npx tsx scripts/seo-cluster-content-2026-07.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SCRATCH = "/private/tmp/claude-501/-Users-admin-PhoneTrade/9d8f3033-8b1f-44a7-93d6-566f5bf6aef6/scratchpad";
const FILES = ["blog-cluster-1.json", "blog-cluster-2.json"];

type Article = {
  slug: string; title: string; excerpt: string; meta_title: string; meta_description: string;
  category_id: string; tags: string[]; coverCategory?: string; content_html: string;
};

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

async function coverFor(db: SupabaseClient, cat: string | undefined): Promise<string | null> {
  if (!cat) return null;
  const { data } = await db.from("products").select("image").eq("category_slug", cat).eq("status", "published").not("image", "is", null).limit(1).maybeSingle();
  return (data?.image as string) ?? null;
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const articles: Article[] = FILES.flatMap((f) => JSON.parse(readFileSync(`${SCRATCH}/${f}`, "utf8")) as Article[]);
  let ok = 0;
  for (const a of articles) {
    const cover = await coverFor(db, a.coverCategory);
    const row = {
      slug: a.slug, title: a.title, excerpt: a.excerpt, content: a.content_html,
      cover_url: cover, og_image_url: cover, category_id: a.category_id, tags: a.tags ?? [],
      status: "published", meta_title: a.meta_title, meta_description: a.meta_description,
      published_at: now, updated_at: now,
    };
    const { data: ex } = await db.from("blog_posts").select("id").eq("slug", a.slug).maybeSingle();
    if (ex?.id) {
      const { error } = await db.from("blog_posts").update(row).eq("id", ex.id);
      if (error) { console.warn("upd fail", a.slug, error.message); continue; }
      console.log(`↻ ${a.slug}`);
    } else {
      const { error } = await db.from("blog_posts").insert({ id: randomUUID(), created_at: now, ...row });
      if (error) { console.warn("ins fail", a.slug, error.message); continue; }
      console.log(`✓ ${a.slug} (cover ${cover ? "✓" : "✗"})`);
    }
    ok++;
  }
  console.log(`\nОпубликовано: ${ok}/${articles.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
