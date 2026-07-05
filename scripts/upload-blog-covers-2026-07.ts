/**
 * Скачивает сгенерированные (higgsfield nano_banana_2) обложки статей-кластеров,
 * заливает в Storage (product-images/blog/covers) и прописывает cover_url+og.
 * Запуск: npx tsx scripts/upload-blog-covers-2026-07.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_35tqH0JFWym7C2NlfAoymGGh8xp";
const COVERS: Record<string, string> = {
  "noutbuk-apple-belgorod": `${CDN}/hf_20260705_140453_3ae67e94-f5ca-427f-9c40-058a4e7b4dba.png`,
  "iphone-17-ili-17-pro": `${CDN}/hf_20260705_140453_88dfaf09-1526-4149-8a4f-799a85b77919.png`,
  "iphone-16-ili-iphone-17": `${CDN}/hf_20260705_140455_c9a9162f-cf48-47f4-92b2-a53f829e3f96.png`,
  "playstation-5-ili-xbox-belgorod": `${CDN}/hf_20260705_140456_c2f10c5a-82bb-4ac8-a3fc-ef5231933cd3.png`,
  "naushniki-apple-airpods-belgorod": `${CDN}/hf_20260705_140508_a880a30c-f926-4476-9783-c1288d2c17fd.png`,
  "airpods-pro-ili-airpods-4": `${CDN}/hf_20260705_140509_2b815f0b-abab-43d9-93ae-7963f1fa5539.png`,
  "smart-chasy-apple-watch-belgorod": `${CDN}/hf_20260705_140511_61d4891f-a640-4e64-a414-a76ea540ff6b.png`,
  "apple-watch-ultra-ili-series": `${CDN}/hf_20260705_140512_438c6569-d469-4bf2-9d11-a5af62ba032b.png`,
};

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const now = new Date().toISOString();
  let ok = 0;
  for (const [slug, url] of Object.entries(COVERS)) {
    const res = await fetch(url);
    if (!res.ok) { console.warn("dl fail", slug, res.status); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `blog/covers/${slug}.png`;
    const up = await db.storage.from("product-images").upload(path, buf, { contentType: "image/png", upsert: true });
    if (up.error) { console.warn("upload fail", slug, up.error.message); continue; }
    const publicUrl = `${base}/storage/v1/object/public/product-images/${path}`;
    const { error } = await db.from("blog_posts").update({ cover_url: publicUrl, og_image_url: publicUrl, updated_at: now }).eq("slug", slug);
    if (error) { console.warn("db fail", slug, error.message); continue; }
    console.log(`✓ ${slug} → ${publicUrl}`);
    ok++;
  }
  console.log(`\nОбновлено обложек: ${ok}/${Object.keys(COVERS).length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
