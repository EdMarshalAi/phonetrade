/**
 * Скачивает найденные у конкурентов фото (проверенные субагентами URL) в наш
 * Storage и проставляет: MacBook Silver — главное фото + галерею; iPhone без
 * галереи — галерею (доп. кадры). Запуск: npx tsx scripts/fill-missing-photos.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type Group = { key: string; urls: string[]; ids: string[]; main?: boolean };
const GROUPS: Group[] = [
  { key: "macbook-air-m1-silver", main: true, ids: ["apple-macbook-air-13-m18256-silver"],
    urls: ["https://c.dns-shop.ru/thumb/st1/fit/500/500/4146ca83cfa3fc1470543f989fec9250/e1640dca485c1dbd5d7f91f3d08f68b91c79a374445d5b6baa6403de36354699.jpg","https://c.dns-shop.ru/thumb/st4/fit/500/500/4c4c3bb2d77e4a15b4bdf0ec25873aba/e166cb2483d3157ca1cac7c5830c612166a3f86a3961b9c986577ef8c20711e3.jpg"] },
  { key: "iphone-air-cloud-white", ids: ["iphone-air-256gb-cloud-white-esim-256gb","iphone-air-512gb-cloud-white-esim-512gb"],
    urls: ["https://c.dns-shop.ru/thumb/st1/fit/0/0/59b498120a5927b526ee8d712b210d56/1a3827b298e81c13910e42a6a7a15b76f4bf8ee78ed66f8e4abfcfa7422013ff.jpg","https://c.dns-shop.ru/thumb/st1/fit/0/0/619e5434f5c498a1ee7a9f97e41f6b29/e7b4495d71b47c9047a67d596f2a97598a4594ff7e7d7d8aa2244ea650ab1a8e.jpg"] },
  { key: "iphone-12-pro-silver", ids: ["USED-IP12PROU-WHI-128-01","USED-IP12PROU-WHI-256-01"],
    urls: ["https://cdn.shop.megafon.ru/images/600/goods/1359/135958_original_front.png","https://cdn.shop.megafon.ru/images/600/goods/1359/135958_original_dop_1.png"] },
  { key: "iphone-12-purple", ids: ["USED-IP12U-PUR-128-01","USED-IP12U-PUR-128-02","USED-IP12U-PUR-64-01"],
    urls: ["https://cdn.shop.megafon.ru/images/600/goods/1409/140919_original_front.png","https://cdn.shop.megafon.ru/images/600/goods/1409/140919_original_dop_1.png"] },
  { key: "iphone-13-blue", ids: ["USED-IP13-BLU-128-01"],
    urls: ["https://cdn.shop.megafon.ru/images/600/goods/1470/147042_original_front.png","https://cdn.shop.megafon.ru/images/600/goods/1470/147042_original_dop_1.png"] },
  { key: "iphone-13-promax-graphite", ids: ["USED-IP13PROMAX-BLA-1024-01","USED-IP13PROMAX-BLA-512-01"],
    urls: ["https://static.re-store.ru/upload/iblock/8af/xtqc15g3zbqw6e6tc2ad6x8flu6xziee.jpg","https://static.re-store.ru/upload/resize_cache/iblock/4c4/100500_800_140cd750bba9870f18aada2478b24840a/f6ng120c3mw32f4qgkiuykmykj73g3md.jpg"] },
  { key: "iphone-13-promax-gold", ids: ["USED-IP13PROMAX-GOL-512-01"],
    urls: ["https://static.re-store.ru/upload/iblock/639/maxizckad2lct2k5hml5eremzs8qczkr.jpg","https://static.re-store.ru/upload/resize_cache/iblock/7eb/100500_800_140cd750bba9870f18aada2478b24840a/39x6kg9wp52rv8xu198j3a126az6q8g1.jpg"] },
  { key: "iphone-13-promax-sierra-blue", ids: ["USED-IP13PROMAX-LIG-256-01","USED-IP13PROMAX-LIG-256-02"],
    urls: ["https://static.re-store.ru/upload/iblock/79d/r1yi2p3td3dp4837dm00f8o2kwaom2lr.jpg","https://static.re-store.ru/upload/resize_cache/iblock/1b8/100500_800_140cd750bba9870f18aada2478b24840a/p23gu901vefj3cqbyft80rrl667to2wn.jpg"] },
  { key: "iphone-13-pro-graphite", ids: ["USED-IP13PROU-BLA-256-01","USED-IP13PROU-BLA-256-02"],
    urls: ["https://niceapplespb.ru/wp-content/uploads/2022/03/13progray.jpg","https://niceapplespb.ru/wp-content/uploads/2022/03/black_2-2-2-600x599.jpeg"] },
  { key: "iphone-13-pro-gold", ids: ["USED-IP13PROU-GOL-256-01","USED-IP13PROU-GOL-256-02"],
    urls: ["https://niceapplespb.ru/wp-content/uploads/2022/03/13progold.jpg","https://niceapplespb.ru/wp-content/uploads/2022/03/gold_2-1-1.jpeg"] },
  { key: "iphone-13-pro-sierra-blue", ids: ["USED-IP13PROU-LIG-128-01"],
    urls: ["https://niceapplespb.ru/wp-content/uploads/2022/03/13problue.jpg","https://niceapplespb.ru/wp-content/uploads/2022/03/blue_2-3-600x599.jpeg"] },
  { key: "iphone-14-plus-midnight", ids: ["USED-IP14PLUSU-BLA-128-01","USED-IP14PLUSU-BLA-256-01"],
    urls: ["https://gadget-device.ru/pictures/product/big/77412_big.jpg","https://gbstore.ru/pictures/product/big/24797_big.jpg"] },
  { key: "iphone-xr-white", ids: ["USED-IPXRU-WHI-128-01","USED-IPXRU-WHI-64-01","USED-IPXRU-WHI-64-02"],
    urls: ["https://gbstore.ru/pictures/product/big/62_big.jpg","https://gbstore.ru/pictures/product/big/64_big.jpg"] },
];

function refererFor(u: string): string {
  const h = new URL(u).hostname;
  if (h.includes("dns-shop")) return "https://www.dns-shop.ru/";
  if (h.includes("megafon")) return "https://shop.megafon.ru/";
  if (h.includes("re-store")) return "https://re-store.ru/";
  return `https://${h}/`;
}

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

async function dl(u: string): Promise<{ buf: Uint8Array; ext: string } | null> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Referer: refererFor(u), Accept: "image/avif,image/webp,image/*,*/*" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) { console.warn("  ✗", r.status, u); return null; }
    const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength < 6000) { console.warn("  ✗ small", buf.byteLength, u); return null; }
    return { buf, ext: ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg" };
  } catch (e) { console.warn("  ✗", (e as Error).message, u); return null; }
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let okMain = 0, okGal = 0;
  for (const g of GROUPS) {
    const imgs: { buf: Uint8Array; ext: string }[] = [];
    for (const u of g.urls) { const d = await dl(u); if (d) imgs.push(d); }
    if (imgs.length === 0) { console.log("✗ нет фото:", g.key); continue; }
    for (const id of g.ids) {
      const galUrls: string[] = [];
      let mainUrl = "";
      for (let i = 0; i < imgs.length; i++) {
        const isMainShot = g.main && i === 0;
        const path = isMainShot ? `imported/${id}.${imgs[i].ext}` : `imported/${id}-r${i}.${imgs[i].ext}`;
        const up = await db.storage.from(BUCKET).upload(path, imgs[i].buf, { contentType: `image/${imgs[i].ext}`, upsert: true });
        if (up.error) { console.warn("  upload err", up.error.message); continue; }
        const pub = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        if (isMainShot) mainUrl = pub; else galUrls.push(pub);
      }
      const patch: Record<string, unknown> = { gallery: galUrls, updated_at: new Date().toISOString() };
      if (g.main && mainUrl) { patch.image = mainUrl; okMain++; }
      await db.from("products").update(patch).eq("id", id);
      okGal++;
      console.log(`✓ ${id}: главное=${g.main ? "да" : "—"} галерея=${galUrls.length}`);
    }
  }
  console.log(`Готово. Главных фото: ${okMain}, товаров с галереей/обновлено: ${okGal}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
