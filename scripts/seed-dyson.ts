/**
 * Заводит категорию Dyson: 3 подкатегории + товары из прайса, с привязкой к
 * формуле (как iPhone): закупка cost_rub back-solve из цены наличными прайса,
 * чтобы recalculate_all_prices выдал ровно прайсовые цены. Наценка категории
 * Dyson = 15% (картой/нал в прайсе ровно ×1.15 — это наша формула).
 * Фото/описания/мета — отдельно субагентами.
 * Запуск: npx tsx scripts/seed-dyson.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

const RATE = 71.02;      // рабочий курс
const MARKUP = 15;       // наценка категории Dyson (%)
const COST_RATE = 76.84; // курс закупа (как у остальной техники)
// закупка в рублях, при которой формула даст ровно прайсовую цену наличными
const costRubFor = (cash: number) => Math.round((cash / (RATE * (1 + MARKUP / 100))) * COST_RATE);

type Sub = { slug: string; title: string; subtitle: string; sort: number };
const SUBS: Sub[] = [
  { slug: "dyson-stylers", title: "Стайлеры Dyson", subtitle: "Airwrap (укладка)", sort: 0 },
  { slug: "dyson-hair-dryers", title: "Фены Dyson", subtitle: "Supersonic", sort: 1 },
  { slug: "dyson-straighteners", title: "Фены-выпрямители Dyson", subtitle: "Airstrait", sort: 2 },
];

type P = { id: string; sku: string; title: string; sub: string; color: string; cash: number };
const PRODUCTS: P[] = [
  // Стайлеры Airwrap — наличными 40 000
  { id: "dyson-airwrap-hs08-jasper-plum", sku: "DY-HS08-JASPLUM", title: "Dyson Стайлер Airwrap HS08 Jasper Plum", sub: "dyson-stylers", color: "Сливовый", cash: 40000 },
  { id: "dyson-airwrap-hs08-ceramic-pink", sku: "DY-HS08-CERPINK", title: "Dyson Стайлер Airwrap HS08 Ceramic Pink", sub: "dyson-stylers", color: "Розовый", cash: 40000 },
  { id: "dyson-airwrap-hs05-diffuse-strawberry", sku: "DY-HS05-STRAW", title: "Dyson Стайлер Airwrap HS05 Diffuse Strawberry", sub: "dyson-stylers", color: "Розовый", cash: 40000 },
  { id: "dyson-airwrap-hs05-nickel-copper", sku: "DY-HS05-NICKCOP", title: "Dyson Стайлер Airwrap HS05 Nickel/Copper", sub: "dyson-stylers", color: "Никель/медь", cash: 40000 },
  { id: "dyson-airwrap-hs05-fuchsia-nickel", sku: "DY-HS05-FUCHNICK", title: "Dyson Стайлер Airwrap HS05 Fuchsia/Nickel", sub: "dyson-stylers", color: "Фуксия/никель", cash: 40000 },
  { id: "dyson-airwrap-hs05-blue-blush", sku: "DY-HS05-BLUEBL", title: "Dyson Стайлер Airwrap HS05 Blue/Blush", sub: "dyson-stylers", color: "Синий", cash: 40000 },
  { id: "dyson-airwrap-hs05-blue-copper", sku: "DY-HS05-BLUECOP", title: "Dyson Стайлер Airwrap HS05 Blue/Copper", sub: "dyson-stylers", color: "Синий/медь", cash: 40000 },
  // Фены Supersonic — наличными 34 000
  { id: "dyson-supersonic-hd08-vinca-blue", sku: "DY-HD08-VINCA", title: "Dyson Фен Supersonic HD08 Vinca Blue (с кейсом)", sub: "dyson-hair-dryers", color: "Синий", cash: 34000 },
  { id: "dyson-supersonic-hd07-fuchsia-nickel", sku: "DY-HD07-FUCH", title: "Dyson Фен Supersonic HD07 Fuchsia Nickel", sub: "dyson-hair-dryers", color: "Фуксия/никель", cash: 34000 },
  { id: "dyson-supersonic-hd08-nickel-copper", sku: "DY-HD08-NICKCOP", title: "Dyson Фен Supersonic HD08 Nickel/Copper", sub: "dyson-hair-dryers", color: "Никель/медь", cash: 34000 },
  { id: "dyson-supersonic-nural-hd16-vinca-blue", sku: "DY-HD16-VINCA", title: "Dyson Фен Supersonic Nural HD16 Vinca Blue/Topaz (с кейсом)", sub: "dyson-hair-dryers", color: "Синий", cash: 34000 },
  // Фены-выпрямители Corrale — наличными 33 000
  { id: "dyson-corrale-ht01-nickel-copper", sku: "DY-HT01-NICKCOP", title: "Dyson Фен-выпрямитель Airstrait HT01 Nickel/Copper", sub: "dyson-straighteners", color: "Никель/медь", cash: 33000 },
  { id: "dyson-corrale-ht01-kanzan-pink", sku: "DY-HT01-KANZAN", title: "Dyson Фен-выпрямитель Airstrait HT01 Kanzan Pink (с кейсом)", sub: "dyson-straighteners", color: "Розовый", cash: 33000 },
  { id: "dyson-corrale-ht01-red-velvet-case", sku: "DY-HT01-REDVELC", title: "Dyson Фен-выпрямитель Airstrait HT01 Red Velvet (с кейсом)", sub: "dyson-straighteners", color: "Красный", cash: 33000 },
  { id: "dyson-corrale-ht01-red-velvet", sku: "DY-HT01-REDVEL", title: "Dyson Фен-выпрямитель Airstrait HT01 Red Velvet", sub: "dyson-straighteners", color: "Красный", cash: 33000 },
];

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  // 1) Подкатегории Dyson (наследуют наценку родителя 15%, фильтр по цвету)
  for (const s of SUBS) {
    const { error } = await db.from("categories").upsert({
      slug: s.slug, id: s.slug, title: s.title, subtitle: s.subtitle, sort: s.sort,
      parent_slug: "dyson", is_published: true, available_filters: ["color"],
      markup_percent: MARKUP, min_margin_rub: 5000, image: "", default_sort: "price-asc", updated_at: now,
    }, { onConflict: "slug" });
    if (error) throw error;
  }

  // 2) Товары (закупка под формулу), затем пересчёт
  const ids: string[] = [];
  for (const p of PRODUCTS) {
    const cost_rub = costRubFor(p.cash);
    const { error } = await db.from("products").upsert({
      id: p.id, sku: p.sku, title: p.title, category_slug: p.sub, color: p.color,
      type: "new", is_new: true, status: "published", in_stock: true, is_available: true,
      cost_rub, cost_rate: COST_RATE, sort: 0, updated_at: now,
    }, { onConflict: "id" });
    if (error) throw error;
    ids.push(p.id);
    console.log(`OK ${p.id} — закупка ${cost_rub} (нал прайс ${p.cash})`);
  }

  // 3) Пересчёт формулой по новым id
  const { error: rpcErr } = await db.rpc("recalculate_all_prices", { p_reason: "Dyson seed", p_ids: ids });
  if (rpcErr) throw rpcErr;

  // 4) Проверка: цена наличными == прайс
  const { data: after } = await db.from("products").select("id,price_cash,price_card,credit_24m_total").in("id", ids);
  const byId = new Map((after ?? []).map((r: any) => [r.id, r]));
  let ok = 0, bad = 0;
  for (const p of PRODUCTS) {
    const r = byId.get(p.id);
    if (r && Math.round(Number(r.price_cash)) === p.cash) ok++; else { bad++; console.log(`  ! ${p.id}: ${r?.price_cash} (ждали ${p.cash})`); }
  }
  console.log(`\nГотово: подкатегорий=${SUBS.length}, товаров=${PRODUCTS.length}, цена==прайс: ${ok}/${PRODUCTS.length}, расхождений=${bad}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
