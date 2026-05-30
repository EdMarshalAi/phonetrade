/**
 * Импорт реального каталога PhoneTrade из JSON в Supabase.
 * Категории заливаются заранее (через SQL). Здесь — только товары + история цен.
 * Запуск: npx tsx scripts/import-catalog.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const JSON_PATH = "/Users/admin/Downloads/phonetrade-products-import.json";
const NEW_SERIES = new Set(["iphone-17", "iphone-17-pro", "iphone-17-pro-max", "iphone-air", "iphone-16e", "samsung-galaxy-s26-ultra"]);

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* optional */ }
}

type J = {
  sku: string; title: string; slug: string; type: string; category_slug: string; brand: string; series: string;
  memory_gb: number; color: { ru: string; en: string; hex: string }; badges: string[]; image_urls: string[];
  pricing: { cost_rub: number; cost_rate: number; cost_usd: number; price_cash: number; price_card: number;
    credit_6m_total: number; credit_6m_monthly: number; credit_12m_total: number; credit_12m_monthly: number;
    credit_24m_total: number; credit_24m_monthly: number };
};

function simText(badges: string[]): string {
  if (badges.includes("sim_plus_esim")) return "SIM + eSIM";
  if (badges.includes("esim_only")) return "eSIM";
  return "SIM";
}
function mapBadges(p: J): string[] {
  const out = ["check-availability"];
  if (p.badges.includes("no_rustore")) out.push("no-rustore");
  if (NEW_SERIES.has(p.category_slug)) out.push("new");
  return out;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const data = JSON.parse(readFileSync(JSON_PATH, "utf8")) as { products: J[] };
  const now = new Date().toISOString();

  // SKU в источнике местами дублируются — делаем уникальными (суффикс у 2-го+).
  const seenSku = new Map<string, number>();
  const uniqueSku = (sku: string): string => {
    const n = (seenSku.get(sku) ?? 0) + 1;
    seenSku.set(sku, n);
    return n === 1 ? sku : `${sku}-${n}`;
  };

  const rows = data.products.map((p) => ({
    id: p.slug,
    title: p.title,
    slug: p.slug,
    sku: uniqueSku(p.sku),
    category_slug: p.category_slug,
    brand: p.brand,
    type: "new",
    model: p.series,
    color: p.color.ru,
    memory: `${p.memory_gb}GB`,
    sim: simText(p.badges),
    image: p.image_urls?.[0] ?? "",
    gallery: null,
    options: { hex: p.color.hex, color_en: p.color.en },
    badges: mapBadges(p),
    price_cash: p.pricing.price_cash,
    price_card: p.pricing.price_card,
    price_old: null,
    cost_rub: p.pricing.cost_rub,
    cost_rate: p.pricing.cost_rate,
    credit_6m_total: p.pricing.credit_6m_total,
    credit_6m_monthly: p.pricing.credit_6m_monthly,
    credit_12m_total: p.pricing.credit_12m_total,
    credit_12m_monthly: p.pricing.credit_12m_monthly,
    credit_24m_total: p.pricing.credit_24m_total,
    credit_24m_monthly: p.pricing.credit_24m_monthly,
    installment_from: p.pricing.credit_24m_monthly,
    prices_recalculated_at: now,
    price_override: false,
    is_used: false,
    is_new: NEW_SERIES.has(p.category_slug),
    in_stock: true,
    is_available: true,
    stock: null,
    status: "published",
    is_indexable: true,
    created_at: now,
    updated_at: now,
    published_at: now,
  }));

  // вставка пачками по 50
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
    if (error) throw error;
    inserted += chunk.length;
  }
  console.log(`OK products: ${inserted}`);

  const history = data.products.map((p) => ({
    product_id: p.slug,
    cost_rub: p.pricing.cost_rub,
    cost_rate: p.pricing.cost_rate,
    cost_usd: p.pricing.cost_usd,
    price_cash: p.pricing.price_cash,
    price_card: p.pricing.price_card,
    credit_6m_total: p.pricing.credit_6m_total,
    credit_12m_total: p.pricing.credit_12m_total,
    credit_24m_total: p.pricing.credit_24m_total,
    reason: "initial_import",
    changed_at: now,
  }));
  for (let i = 0; i < history.length; i += 50) {
    const { error } = await db.from("product_price_history").insert(history.slice(i, i + 50));
    if (error) throw error;
  }
  console.log(`OK price history: ${history.length}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
