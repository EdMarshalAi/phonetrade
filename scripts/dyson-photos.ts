/**
 * Скачивает проверенные фото Dyson (Ozon/WB/М.Видео CDN) в наш Storage и
 * проставляет products.image (главное) + products.gallery (доп., БЕЗ главного).
 * URL — только реально проверенные (200 + image/*). Идемпотентно (upsert).
 * Запуск: npx tsx scripts/dyson-photos.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type Photo = { id: string; main: string; gallery: string[] };

// По требованию владельца: ОДНО чистое фото на товар (без галереи), приоритет —
// официальные кадры Ozon на белом без водяных знаков/текста. Все URL проверены
// curl (200 + image/*). gallery: [] заодно чистит прежние галереи.
const PHOTOS: Photo[] = [
  // --- Supersonic ---
  { id: "dyson-supersonic-hd08-vinca-blue", main: "https://ir.ozone.ru/s3/multimedia-v/6433006735.jpg", gallery: [] },
  { id: "dyson-supersonic-hd07-fuchsia-nickel", main: "https://cdn1.ozone.ru/s3/multimedia-1-h/7136517365.jpg", gallery: [] },
  { id: "dyson-supersonic-hd08-nickel-copper", main: "https://ir.ozone.ru/s3/multimedia-p/6799568569.jpg", gallery: [] },
  { id: "dyson-supersonic-nural-hd16-vinca-blue", main: "https://img.mvideo.ru/Big/20090621bb1.jpg", gallery: [] },
  // --- Airwrap (приоритет ir/cdn1.ozone — чистые официальные кадры) ---
  { id: "dyson-airwrap-hs08-jasper-plum", main: "https://img.mvideo.ru/Big/400805886bb2.jpg", gallery: [] },
  { id: "dyson-airwrap-hs08-ceramic-pink", main: "https://img.mvideo.ru/Big/20097066bb1.jpg", gallery: [] },
  { id: "dyson-airwrap-hs05-diffuse-strawberry", main: "https://ir.ozone.ru/s3/multimedia-1-e/7304269118.jpg", gallery: [] },
  { id: "dyson-airwrap-hs05-nickel-copper", main: "https://ir.ozone.ru/s3/multimedia-m/6778075090.jpg", gallery: [] },
  { id: "dyson-airwrap-hs05-fuchsia-nickel", main: "https://ir.ozone.ru/s3/multimedia-1/6788826073.jpg", gallery: [] },
  { id: "dyson-airwrap-hs05-blue-blush", main: "https://img.mvideo.ru/Big/20084953bb6.jpg", gallery: [] },
  { id: "dyson-airwrap-hs05-blue-copper", main: "https://cdn1.ozone.ru/s3/multimedia-6/6533616558.jpg", gallery: [] },
  // --- Airstrait HT01 (выпрямитель) ---
  { id: "dyson-corrale-ht01-nickel-copper", main: "https://cdn1.ozone.ru/s3/multimedia-1-u/7387355874.jpg", gallery: [] },
  { id: "dyson-corrale-ht01-kanzan-pink", main: "https://img.mvideo.ru/Big/400589624bb3.jpg", gallery: [] },
  { id: "dyson-corrale-ht01-red-velvet-case", main: "https://img.mvideo.ru/Big/400454383bb3.jpg", gallery: [] },
  { id: "dyson-corrale-ht01-red-velvet", main: "https://img.mvideo.ru/Big/400454383bb3.jpg", gallery: [] },
];

function refererFor(u: string): string {
  const h = new URL(u).hostname;
  if (h.includes("ozon")) return "https://www.ozon.ru/";
  if (h.includes("wbbasket")) return "https://www.wildberries.ru/";
  if (h.includes("mvideo")) return "https://www.mvideo.ru/";
  if (h.includes("dns-shop")) return "https://www.dns-shop.ru/";
  return `https://${h}/`;
}

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

async function dl(u: string): Promise<{ buf: Uint8Array; ext: string } | null> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Referer: refererFor(u), Accept: "image/avif,image/webp,image/*,*/*" }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) { console.warn("  ✗", r.status, u); return null; }
    const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
    if (!ct.startsWith("image/")) { console.warn("  ✗ not image", ct, u); return null; }
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength < 4000) { console.warn("  ✗ small", buf.byteLength, u); return null; }
    return { buf, ext: ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg" };
  } catch (e) { console.warn("  ✗", (e as Error).message, u); return null; }
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let ok = 0, fail = 0;
  for (const p of PHOTOS) {
    const mainImg = await dl(p.main);
    if (!mainImg) { console.log(`✗ ${p.id}: нет главного фото`); fail++; continue; }
    // Токен из источника в имени файла → при смене источника меняется и
    // публичный URL (сброс кэша браузера/CDN), при том же источнике путь
    // стабилен (идемпотентность).
    const token = ((new URL(p.main).pathname.split("/").pop() || "").replace(/\.[a-z]+$/i, "").replace(/[^a-z0-9]/gi, "").slice(-12)) || "main";
    const mainPath = `dyson/${p.id}-${token}.${mainImg.ext}`;
    const up = await db.storage.from(BUCKET).upload(mainPath, mainImg.buf, { contentType: `image/${mainImg.ext}`, upsert: true });
    if (up.error) { console.warn("  upload err", up.error.message); fail++; continue; }
    const image = db.storage.from(BUCKET).getPublicUrl(mainPath).data.publicUrl;

    const gallery: string[] = [];
    for (let i = 0; i < p.gallery.length; i++) {
      const g = await dl(p.gallery[i]);
      if (!g) continue;
      const gp = `dyson/${p.id}-r${i}.${g.ext}`;
      const gu = await db.storage.from(BUCKET).upload(gp, g.buf, { contentType: `image/${g.ext}`, upsert: true });
      if (gu.error) { console.warn("  gallery upload err", gu.error.message); continue; }
      gallery.push(db.storage.from(BUCKET).getPublicUrl(gp).data.publicUrl);
    }

    const { error } = await db.from("products").update({ image, gallery, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { console.warn("  db err", error.message); fail++; continue; }
    ok++;
    console.log(`✓ ${p.id}: главное + галерея ${gallery.length}`);
  }
  console.log(`\nГотово: с фото ${ok}, ошибок ${fail}, всего ${PHOTOS.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
