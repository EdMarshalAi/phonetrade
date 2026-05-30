/**
 * Скачивает доп. фото iPhone с мвидео (другие ракурсы того же товара: bb1/bb2/bb3)
 * к нам в Storage и заполняет products.gallery (2 доп. кадра), чтобы фото листались.
 * Источник mvideo-id берётся из исходных JSON-импортов (по slug/sku товара).
 * Скачиваем у конкурента (мвидео), белый фон, та же модель.
 *
 * Запуск: npx tsx scripts/iphone-gallery.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const DELAY = 130;
const D = "/Users/admin/Downloads";
// Файлы импортов и чем ключевать (slug или sku) — DB id товара равен этому ключу.
const SOURCES: { file: string; key: "slug" | "sku" }[] = [
  { file: `${D}/phonetrade-products-import.json`, key: "slug" }, // новые iPhone (id=slug)
  { file: `${D}/phonetrade-used-import.json`, key: "sku" },      // Б/У iPhone (id=sku)
];

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseMvideo(url: string): { id: string; suffix: string } | null {
  const m = (url || "").match(/\/(\d+)(bb\d*)\.(?:jpg|jpeg|png|webp)/i);
  return m ? { id: m[1], suffix: m[2] } : null;
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // map: DB id -> {id (mvideo), suffix (главного)}
  const map = new Map<string, { id: string; suffix: string }>();
  for (const s of SOURCES) {
    try {
      const j = JSON.parse(readFileSync(s.file, "utf8"));
      for (const p of j.products ?? []) {
        const parsed = parseMvideo((p.image_urls ?? [])[0] ?? "");
        if (parsed && p[s.key]) map.set(p[s.key] as string, parsed);
      }
    } catch (e) { console.warn("skip", s.file, (e as Error).message); }
  }
  console.log("Источников mvideo-id:", map.size);

  // iPhone товары без галереи
  const { data: prods } = await db
    .from("products")
    .select("id,title,image,gallery,category_slug")
    .is("deleted_at", null)
    .or("category_slug.like.iphone%,title.ilike.%iphone%")
    .limit(5000);
  const iphones = (prods ?? []).filter(
    (p) => !String(p.category_slug).startsWith("samsung") && (!p.gallery || (Array.isArray(p.gallery) && p.gallery.length === 0))
  );
  console.log("iPhone без галереи:", iphones.length);

  const SUFFIXES = ["bb", "bb1", "bb2", "bb3", "bb4", "bb5"];
  let withExtra = 0, totalImgs = 0; const noSource: string[] = [];

  for (const p of iphones) {
    const src = map.get(p.id as string);
    if (!src) { noSource.push(p.id as string); continue; }

    // длина главного фото (чтобы не дублировать его в галерею)
    let mainLen = -1;
    try {
      const r = await fetch(p.image as string, { method: "GET", signal: AbortSignal.timeout(12000) });
      if (r.ok) mainLen = Number(r.headers.get("content-length")) || (await r.arrayBuffer()).byteLength;
    } catch { /* ignore */ }

    const gallery: string[] = [];
    const seenLen = new Set<number>([mainLen]);
    for (const suf of SUFFIXES) {
      if (gallery.length >= 2) break;
      if (suf === src.suffix) continue; // это главный кадр
      const url = `https://img.mvideo.ru/Big/${src.id}${suf}.jpg`;
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!resp.ok) { await sleep(DELAY); continue; }
        const buf = new Uint8Array(await resp.arrayBuffer());
        if (buf.byteLength < 3000 || seenLen.has(buf.byteLength)) { await sleep(DELAY); continue; }
        seenLen.add(buf.byteLength);
        const path = `imported/${p.id}-g${gallery.length + 1}.jpg`;
        const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: true });
        if (up.error) { await sleep(DELAY); continue; }
        gallery.push(db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      } catch { /* ignore */ }
      await sleep(DELAY);
    }

    if (gallery.length > 0) {
      await db.from("products").update({ gallery, updated_at: new Date().toISOString() }).eq("id", p.id);
      withExtra++; totalImgs += gallery.length;
    }
  }
  console.log(`Готово. С доп.фото: ${withExtra}/${iphones.length}, всего доп.картинок: ${totalImgs}. Без mvideo-источника: ${noSource.length}`);
  if (noSource.length) console.log("Без источника (первые 10):", noSource.slice(0, 10).join(", "));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
