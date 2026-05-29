/**
 * Заливает изображения из /public (categories, products) в Supabase Storage и
 * переставляет ссылки в БД (categories.image/icon_url, bento_tiles, hero_slides,
 * products.image) на Storage-URL — чтобы картинки отображались в админке и
 * не были захардкожены на /public. Идемпотентно (upsert).
 *
 * Запуск: npm run upload:images
 * Нужны: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY в .env.local
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const pub = resolve(process.cwd(), "public");

  async function uploadDir(localDir: string, bucket: string, prefix: string): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    let files: string[] = [];
    try {
      files = readdirSync(join(pub, localDir)).filter((f) => /\.(png|jpe?g|webp|svg|avif)$/i.test(f));
    } catch {
      return map;
    }
    for (const f of files) {
      const buf = readFileSync(join(pub, localDir, f));
      const ext = f.split(".").pop()!.toLowerCase();
      const ct = ext === "svg" ? "image/svg+xml" : ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      const path = `${prefix}/${f}`;
      const up = await db.storage.from(bucket).upload(path, buf, { contentType: ct, upsert: true });
      if (up.error) {
        console.error(`  ! ${bucket}/${path}: ${up.error.message}`);
        continue;
      }
      map[f] = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    console.log(`OK ${bucket}/${prefix}: ${Object.keys(map).length} файлов`);
    return map;
  }

  // 1) Категории → bucket bento-tiles/categories
  const catMap = await uploadDir("categories", "bento-tiles", "categories");
  // 2) Товары → bucket product-images/products
  const prodMap = await uploadDir("products", "product-images", "products");

  const slugs = ["iphone", "ipad", "mac", "watch", "accessories"];
  for (const slug of slugs) {
    const cut = catMap[`${slug}-cutout.png`];
    if (!cut) continue;
    await db.from("categories").update({ image: cut, icon_url: cut, updated_at: new Date().toISOString() }).eq("slug", slug);
    await db.from("bento_tiles").update({ custom_image_url: cut }).eq("category_slug", slug);
  }
  console.log("OK categories.image/icon_url + bento_tiles.custom_image_url обновлены");

  // 3) Hero-слайды: сопоставляем по имени файла в текущем image_url
  const { data: hero } = await db.from("hero_slides").select("id,image_url");
  for (const h of (hero ?? []) as { id: string; image_url: string | null }[]) {
    if (!h.image_url) continue;
    const base = h.image_url.split("/").pop()?.split("?")[0] ?? "";
    if (catMap[base]) await db.from("hero_slides").update({ image_url: catMap[base] }).eq("id", h.id);
  }
  console.log("OK hero_slides.image_url обновлены");

  // 4) Товары: сопоставляем по имени файла в products.image
  const { data: prods } = await db.from("products").select("id,image");
  let pcount = 0;
  for (const p of (prods ?? []) as { id: string; image: string | null }[]) {
    if (!p.image) continue;
    const base = p.image.split("/").pop()?.split("?")[0] ?? "";
    if (prodMap[base]) {
      await db.from("products").update({ image: prodMap[base] }).eq("id", p.id);
      pcount++;
    }
  }
  console.log(`OK products.image обновлены: ${pcount}`);
  console.log("\nГотово. Картинки в Storage, ссылки в БД обновлены.");
}

main().catch((e) => {
  console.error("Ошибка upload-images:", e.message ?? e);
  process.exit(1);
});
