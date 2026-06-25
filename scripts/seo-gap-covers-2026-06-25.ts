/**
 * Ставит сгенерированные (Higgsfield) обложки 16:9 на 5 новых SEO-статей блога
 * и накручивает стартовые просмотры 10–15k (как у остальных постов; реальные
 * суммируются поверх). Идемпотентно. Запуск: npx tsx scripts/seo-gap-covers-2026-06-25.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const B = "https://d8j0ntlcm91z4.cloudfront.net/user_35tqH0JFWym7C2NlfAoymGGh8xp";
const COVERS: { slug: string; url: string }[] = [
  { slug: "playstation-5-belgorod", url: `${B}/hf_20260625_143049_e58ee848-4bb8-4945-843a-c4a70a33a863.png` },
  { slug: "dyson-belgorod-stajler-fen-vypryamitel", url: `${B}/hf_20260625_143056_9b8aa996-625c-4e64-a4d4-3d4ec9621859.png` },
  { slug: "samsung-galaxy-belgorod", url: `${B}/hf_20260625_143057_5cfdc6e8-eb57-4f66-9f3f-27b75f58c8eb.png` },
  { slug: "skolko-stoit-iphone-17-belgorod", url: `${B}/hf_20260625_143058_6d9c5484-00f6-476b-a3ae-30f95b9b9223.png` },
  { slug: "imac-mac-mini-belgorod", url: `${B}/hf_20260625_143100_5484eddc-61dc-4748-b9ca-a2193932cf7f.png` },
];

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  let ok = 0;
  for (const c of COVERS) {
    let cover: string | null = null;
    try {
      const resp = await fetch(c.url, { signal: AbortSignal.timeout(30000) });
      const buf = new Uint8Array(await resp.arrayBuffer());
      const path = `blog/${c.slug}.png`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      cover = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    } catch (e) { console.warn("cover fail", c.slug, (e as Error).message); }

    const views = 10000 + Math.floor(Math.random() * 5001); // 10000–15000
    const patch: Record<string, unknown> = { views_count: views, updated_at: now };
    if (cover) { patch.cover_url = cover; patch.og_image_url = cover; }
    const { error } = await db.from("blog_posts").update(patch).eq("slug", c.slug);
    if (error) { console.warn("update fail", c.slug, error.message); continue; }
    console.log(`✓ ${c.slug} — обложка ${cover ? "✓" : "✗"}, просмотры ${views}`);
    ok++;
  }
  console.log(`\nГотово: ${ok}/${COVERS.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
