/**
 * Импорт Б/У iPhone + аксессуаров. Реюз нашей структуры (плоские категории,
 * без вымышленных родителей). Цены берутся из JSON как есть (price_override=true,
 * формула USD их не трогает). condition_text — свободный текст, battery — % из iOS.
 * Картинки → Supabase Storage. История цен с reason.
 *
 * Запуск: npx tsx scripts/import-used-acc.ts <used.json> <accessories.json>
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const DELAY_MS = 150;

// Б/У: товары ссылаются на базовые слаги new-категорий — уводим в -used
const USED_REMAP: Record<string, string> = {
  "iphone-13": "iphone-13-used",
  "iphone-14": "iphone-14-used",
  "iphone-15": "iphone-15-used",
};

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
const memText = (gb: number | null) => (gb == null ? null : gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} ТБ` : `${gb} ГБ`);

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
  const [usedPath, accPath] = process.argv.slice(2);
  if (!usedPath || !accPath) throw new Error("Передай пути: used.json accessories.json");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const used = JSON.parse(readFileSync(usedPath, "utf8"));
  const acc = JSON.parse(readFileSync(accPath, "utf8"));
  const now = new Date().toISOString();

  // ── 1) Категории ──────────────────────────────────────────────────────────
  // Б/У iPhone: родитель + per-model -used (из JSON + синтезированные 13/14/15)
  const usedCats = [
    { slug: "iphone-used", title: "iPhone (Б/У)", parent_slug: null, sort: 7 },
    ...(used.categories as any[]).map((c, i) => ({ slug: c.slug, title: c.title, parent_slug: "iphone-used", sort: 100 + (c.sort_order ?? i) })),
    { slug: "iphone-13-used", title: "iPhone 13", parent_slug: "iphone-used", sort: 130 },
    { slug: "iphone-14-used", title: "iPhone 14", parent_slug: "iphone-used", sort: 140 },
    { slug: "iphone-15-used", title: "iPhone 15", parent_slug: "iphone-used", sort: 150 },
  ];
  // Аксессуары: создаём только отсутствующие (airpods/apple-accessories уже есть)
  const accCats = [
    { slug: "apple-pencil", title: "Apple Pencil", parent_slug: null, sort: 11 },
    { slug: "mac-accessories", title: "Аксессуары Mac", parent_slug: null, sort: 12 },
    { slug: "ps-accessories", title: "Аксессуары PlayStation", parent_slug: null, sort: 13 },
    { slug: "audio-accessories", title: "Аудио-аксессуары", parent_slug: null, sort: 14 },
  ];
  const catRows = [...usedCats, ...accCats].map((c) => ({
    id: c.slug, slug: c.slug, title: c.title, parent_slug: c.parent_slug,
    sort: c.sort, is_published: true,
    markup_percent: null, min_margin_rub: null, pricing_mode: "fixed_rub",
    updated_at: now,
  }));
  const { error: catErr } = await db.from("categories").upsert(catRows, { onConflict: "slug", ignoreDuplicates: true });
  if (catErr) throw catErr;
  console.log(`Категорий upsert (новые): ${catRows.length}`);

  // ── 2) Товары ───────────────────────────────────────────────────────────
  const seenSlug = new Set<string>();
  const uniqSlug = (s: string) => {
    let slug = s, n = 1;
    while (seenSlug.has(slug)) { n += 1; slug = `${s}-${n}`; }
    seenSlug.add(slug);
    return slug;
  };

  const usedRows = (used.products as any[]).map((p) => {
    const cat = USED_REMAP[p.category_slug] ?? p.category_slug;
    return {
      id: p.sku, sku: p.sku, title: p.title, slug: uniqSlug(p.slug),
      category_slug: cat, brand: p.brand ?? "Apple",
      type: "used", is_used: true, is_new: false,
      color: p.color?.ru ?? "", memory: memText(p.memory_gb ?? null),
      cost_rub: null, cost_rate: null,
      price_cash: p.pricing.price_cash, price_card: p.pricing.price_card,
      credit_6m_total: null, credit_6m_monthly: null, credit_12m_total: null,
      credit_12m_monthly: null, credit_24m_total: null, credit_24m_monthly: null,
      installment_from: null, price_override: true, prices_recalculated_at: now,
      badges: [], condition_text: p.used_info?.condition_text ?? null,
      battery: p.used_info?.battery_health ?? null,
      specs: {
        memory_gb: p.memory_gb ?? null, color_ru: p.color?.ru ?? null,
        color_en: p.color?.en ?? null, color_hex: p.color?.hex ?? null,
        description_source: p.used_info?.description_source ?? "manual_excel",
      },
      stock: 1, is_available: true, status: "published", image: "", updated_at: now,
    };
  });

  const accRows = (acc.products as any[]).map((p) => ({
    id: p.sku, sku: p.sku, title: p.title, slug: uniqSlug(p.slug),
    category_slug: p.category_slug, brand: p.brand ?? null,
    type: "new", is_used: false, is_new: true,
    color: p.color?.ru ?? "", memory: null,
    cost_rub: null, cost_rate: null,
    price_cash: p.pricing.price_cash, price_card: p.pricing.price_card,
    credit_6m_total: null, credit_6m_monthly: null, credit_12m_total: null,
    credit_12m_monthly: null, credit_24m_total: null, credit_24m_monthly: null,
    installment_from: null, price_override: true, prices_recalculated_at: now,
    badges: [],
    specs: {
      subtype: p.subtype ?? null, device_compat: p.device_compat ?? null,
      color_ru: p.color?.ru ?? null, color_en: p.color?.en ?? null, color_hex: p.color?.hex ?? null,
    },
    stock: /уточняйте/i.test(p.availability?.display_text ?? "") ? null : 1,
    is_available: true, status: "published", image: "", updated_at: now,
  }));

  const { error: e1 } = await db.from("products").upsert(usedRows, { onConflict: "id" });
  if (e1) throw e1;
  console.log(`Б/У upsert: ${usedRows.length}`);
  const { error: e2 } = await db.from("products").upsert(accRows, { onConflict: "id" });
  if (e2) throw e2;
  console.log(`Аксессуары upsert: ${accRows.length}`);

  // ── 3) История цен ────────────────────────────────────────────────────────
  const hist = [
    ...usedRows.map((r) => ({ product_id: r.id, price_cash: r.price_cash, price_card: r.price_card, reason: "initial_import_used" })),
    ...accRows.map((r) => ({ product_id: r.id, price_cash: r.price_cash, price_card: r.price_card, reason: "initial_import_accessories" })),
  ];
  const { error: hErr } = await db.from("product_price_history").insert(hist);
  if (hErr) console.warn("История цен:", hErr.message);
  else console.log(`История цен: ${hist.length}`);

  // ── 4) Картинки ──────────────────────────────────────────────────────────
  const all = [
    ...(used.products as any[]).map((p) => ({ id: p.sku, src: (p.image_urls ?? [])[0] })),
    ...(acc.products as any[]).map((p) => ({ id: p.sku, src: (p.image_urls ?? [])[0] })),
  ];
  let ok = 0; const fail: string[] = [];
  for (const it of all) {
    if (!it.src) continue;
    try {
      const resp = await fetch(it.src, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const ct = (resp.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength === 0) throw new Error("пустой файл");
      const path = `imported/${it.id}.${ext}`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
      if (up.error) throw up.error;
      const pub = db.storage.from(BUCKET).getPublicUrl(path);
      const { error } = await db.from("products").update({ image: pub.data.publicUrl, updated_at: new Date().toISOString() }).eq("id", it.id);
      if (error) throw error;
      ok++;
    } catch (e) {
      fail.push(`${it.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Картинок: ${ok}, ошибок: ${fail.length}`);
  if (fail.length) console.log("Проблемные:\n" + fail.join("\n"));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
