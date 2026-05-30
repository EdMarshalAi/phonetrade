/**
 * Переносит фото товаров из внешних URL (img.mvideo.ru) в наш Supabase Storage.
 * Качает картинку, кладёт в бакет product-images/imported/{id}.jpg, переписывает
 * products.image. Последовательно, с задержкой, ошибки логирует и продолжает.
 * Запуск: npx tsx scripts/migrate-images.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const DELAY_MS = 150;

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* optional */ }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: prods, error } = await db
    .from("products")
    .select("id, image")
    .like("image", "http%img.mvideo.ru%")
    .limit(5000);
  if (error) throw error;
  const list = prods ?? [];
  console.log(`К переносу: ${list.length}`);

  let ok = 0;
  const failed: string[] = [];
  for (const p of list) {
    try {
      const resp = await fetch(p.image as string, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const ct = (resp.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength === 0) throw new Error("пустой файл");
      const path = `imported/${p.id}.${ext}`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
      if (up.error) throw up.error;
      const pub = db.storage.from(BUCKET).getPublicUrl(path);
      const newUrl = pub.data.publicUrl;
      const { error: e2 } = await db.from("products").update({ image: newUrl, updated_at: new Date().toISOString() }).eq("id", p.id);
      if (e2) throw e2;
      ok++;
    } catch (e) {
      failed.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Перенесено: ${ok}, ошибок: ${failed.length}`);
  if (failed.length) console.log("Ошибки:\n" + failed.join("\n"));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
