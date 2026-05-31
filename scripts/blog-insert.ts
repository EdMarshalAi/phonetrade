/**
 * Загружает сгенерированные обложки (Higgsfield) в наш Storage и вставляет 5
 * SEO-статей блога из /tmp/blog-*.json. Запуск: npx tsx scripts/blog-insert.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const CAT = {
  iphone: "bfb9f86f-0d4d-4f11-b4da-9bd850a33175",
  ipad: "ecbf09b9-7653-4c09-a7cd-ad6930e56748",
  watch: "46b480d1-8906-4cbb-8614-695965a355a0",
  mac: "84b12ad4-55ae-44c0-bb4e-658c707bebda",
};
const ARTICLES = [
  { file: "/tmp/blog-1.json", cover: "https://d8j0ntlcm91z4.cloudfront.net/user_35tqH0JFWym7C2NlfAoymGGh8xp/hf_20260531_095811_af3d500a-9370-40ac-b383-faa994233755.png", category_id: CAT.iphone },
  { file: "/tmp/blog-2.json", cover: "https://d8j0ntlcm91z4.cloudfront.net/user_35tqH0JFWym7C2NlfAoymGGh8xp/hf_20260531_095817_2fa83181-24f1-4bc6-8bcb-0ee4890b9d19.png", category_id: CAT.iphone },
  { file: "/tmp/blog-3.json", cover: "https://d8j0ntlcm91z4.cloudfront.net/user_35tqH0JFWym7C2NlfAoymGGh8xp/hf_20260531_095822_aec20f70-5c30-4431-883c-fba245fe8fbd.png", category_id: CAT.ipad },
  { file: "/tmp/blog-4.json", cover: "https://d8j0ntlcm91z4.cloudfront.net/user_35tqH0JFWym7C2NlfAoymGGh8xp/hf_20260531_095827_49a883ba-7798-4e2a-938c-6164b0491bcc.png", category_id: CAT.mac },
  { file: "/tmp/blog-5.json", cover: "https://d8j0ntlcm91z4.cloudfront.net/user_35tqH0JFWym7C2NlfAoymGGh8xp/hf_20260531_095833_46b1762a-6044-40de-ae94-34a5931305d0.png", category_id: CAT.watch },
];

function loadEnv() { const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8"); for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } }

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  let ok = 0;
  for (const a of ARTICLES) {
    const art = JSON.parse(readFileSync(a.file, "utf8"));
    // обложка → Storage
    let coverUrl = "";
    try {
      const resp = await fetch(a.cover, { signal: AbortSignal.timeout(30000) });
      const buf = new Uint8Array(await resp.arrayBuffer());
      const path = `blog/${art.slug}.png`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      coverUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    } catch (e) { console.warn("cover fail", art.slug, (e as Error).message); }

    const { error } = await db.from("blog_posts").insert({
      id: randomUUID(),
      slug: art.slug,
      title: art.title,
      excerpt: art.excerpt ?? null,
      content: art.content_html ?? art.content ?? "",
      cover_url: coverUrl || null,
      og_image_url: coverUrl || null,
      category_id: a.category_id,
      tags: Array.isArray(art.tags) ? art.tags : [],
      status: "published",
      meta_title: art.meta_title ?? null,
      meta_description: art.meta_description ?? null,
      published_at: now,
      created_at: now,
      updated_at: now,
    });
    if (error) { console.warn("insert fail", art.slug, error.message); continue; }
    ok++;
    console.log(`✓ ${art.slug} (cover: ${coverUrl ? "да" : "нет"})`);
  }
  console.log(`Статей опубликовано: ${ok}/${ARTICLES.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
