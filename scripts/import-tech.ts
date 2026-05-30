/**
 * Импорт техники (iPad/MacBook/Apple Watch/колонки/приставки/аксессуары) из
 * phonetrade-tech-import.json. Реюз существующих категорий по нашей структуре,
 * закупка восстановлена обратным расчётом (inverted_cost), режим usd_formula.
 * Картинки переносятся в Supabase Storage (bucket product-images/imported/{id}).
 * История цен — reason='initial_import_tech_inverted'.
 *
 * Запуск: npx tsx scripts/import-tech.ts "/абсолютный/путь/к.json"
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const DELAY_MS = 150;

// JSON-слаг категории → наш реальный slug категории
const CAT_MAP: Record<string, string> = {
  ipad: "ipad",
  macbook: "mac",
  "apple-watch": "watch",
  "smart-speakers": "smart-speakers",
  "gaming-consoles": "gaming-consoles",
  "apple-accessories": "accessories",
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

function memText(gb: number | null): string | null {
  if (gb == null) return null;
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} ТБ` : `${gb} ГБ`;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  const jsonPath = process.argv[2];
  if (!jsonPath) throw new Error("Передай путь к JSON первым аргументом");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const j = JSON.parse(readFileSync(jsonPath, "utf8"));
  const products: any[] = j.products ?? [];
  const now = new Date().toISOString();

  // 1) сборка строк товаров
  const rows = products.map((p) => {
    const pr = p.pricing;
    const cat = CAT_MAP[p.category_slug];
    if (!cat) throw new Error(`Нет маппинга категории для ${p.category_slug}`);
    return {
      id: p.slug,
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      category_slug: cat,
      brand: p.brand ?? null,
      type: "new",
      is_new: true,
      is_used: false,
      color: p.color?.ru ?? "",
      memory: memText(p.memory_gb ?? null),
      cost_rub: pr.cost_rub,
      cost_rate: pr.cost_rate,
      // cost_usd — generated column, НЕ пишем
      price_cash: pr.price_cash,
      price_card: pr.price_card,
      credit_6m_total: pr.credit_6m_total,
      credit_6m_monthly: pr.credit_6m_monthly,
      credit_12m_total: pr.credit_12m_total,
      credit_12m_monthly: pr.credit_12m_monthly,
      credit_24m_total: pr.credit_24m_total,
      credit_24m_monthly: pr.credit_24m_monthly,
      installment_from: pr.credit_24m_monthly,
      price_override: false,
      prices_recalculated_at: now,
      badges: Array.isArray(p.badges) ? p.badges : [],
      specs: {
        device: p.device ?? null,
        subtype: p.subtype ?? null,
        memory_gb: p.memory_gb ?? null,
        ram_gb: p.ram_gb ?? null,
        watch_size_mm: p.watch_size_mm ?? null,
        color_ru: p.color?.ru ?? null,
        color_en: p.color?.en ?? null,
        color_hex: p.color?.hex ?? null,
        extras: p.extras ?? [],
        inverted_cost: true,
      },
      stock: null,
      is_available: true,
      status: "published",
      image: "",
      gallery: null as unknown,
      updated_at: now,
    };
  });

  // 2) upsert товаров
  const { error: upErr } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (upErr) throw upErr;
  console.log(`Товаров upsert: ${rows.length}`);

  // 3) история цен
  const hist = products.map((p) => ({
    product_id: p.slug,
    cost_usd: p.pricing.cost_rub / p.pricing.cost_rate,
    price_cash: p.pricing.price_cash,
    price_card: p.pricing.price_card,
    credit_6m_total: p.pricing.credit_6m_total,
    credit_12m_total: p.pricing.credit_12m_total,
    credit_24m_total: p.pricing.credit_24m_total,
    reason: "initial_import_tech_inverted",
  }));
  const { error: hErr } = await db.from("product_price_history").insert(hist);
  if (hErr) console.warn("История цен — ошибка (не критично):", hErr.message);
  else console.log(`История цен: ${hist.length}`);

  // 4) перенос картинок в Storage
  let imgOk = 0;
  const imgFail: string[] = [];
  for (const p of products) {
    const src: string | undefined = (p.image_urls ?? [])[0];
    if (!src) continue;
    try {
      const resp = await fetch(src, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const ct = (resp.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength === 0) throw new Error("пустой файл");
      const path = `imported/${p.slug}.${ext}`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
      if (up.error) throw up.error;
      const pub = db.storage.from(BUCKET).getPublicUrl(path);
      const { error: e2 } = await db.from("products").update({ image: pub.data.publicUrl, updated_at: new Date().toISOString() }).eq("id", p.slug);
      if (e2) throw e2;
      imgOk++;
    } catch (e) {
      imgFail.push(`${p.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Картинок перенесено: ${imgOk}, без фото/ошибок: ${imgFail.length}`);
  if (imgFail.length) console.log("Проблемные:\n" + imgFail.join("\n"));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
