/**
 * SEO-доводка карточек товаров (аудит C5):
 *  1) meta_title  — length-aware ≤60 (keyword «Белгород» сохраняется, пока влезает);
 *  2) meta_description — пересборка ≤160 (раньше резалось до 300 → обрезки в выдаче);
 *  3) description_html — уникальный per-unit лид-абзац (конфигурация/состояние/
 *     аккумулятор) перед общей модельной копией, чтобы 74 одинаковых тела на 317
 *     товаров стали уникальными по первому экрану. Идемпотентно (маркер <!--ul-->).
 * НЕ переписывает модельную копию (E-E-A-T), только добавляет честный лид.
 * Запуск: npx tsx scripts/seo-refine-products.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

function hookFor(cat: string, isUsed: boolean): string {
  if (cat.startsWith("iphone")) return isUsed ? "смартфон Apple iPhone, проверенный Б/У" : "флагманский смартфон Apple iPhone";
  if (cat.startsWith("samsung")) return "флагманский смартфон Samsung Galaxy";
  if (cat === "ipad") return "планшет Apple iPad";
  if (cat === "mac") return "ноутбук Apple на чипе Apple Silicon";
  if (cat === "watch") return "умные часы Apple Watch";
  if (cat === "airpods") return "беспроводные наушники Apple AirPods";
  if (cat === "smart-speakers") return "умная колонка с голосовым помощником";
  if (cat === "gaming-consoles") return "игровая приставка";
  if (cat === "apple-pencil") return "стилус Apple Pencil";
  if (cat === "mac-accessories") return "аксессуар для Mac";
  if (cat === "audio-accessories") return "аудио-аксессуар";
  return "оригинальная техника";
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// meta_title ≤60: режем хвост, не разрывая слово, без висящей пунктуации.
function trimWords(s: string, max: number): string {
  if (s.length <= max) return s;
  let cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  if (sp > max * 0.5) cut = cut.slice(0, sp);
  return cut.replace(/[\s—–\-,.]+$/, "");
}
function buildMetaTitle(title: string): string {
  for (const v of [`${title} — купить в Белгороде`, `${title} — Белгород`, title]) {
    if (v.length <= 60) return v;
  }
  return trimWords(title, 60);
}

// meta_description ≤160: выбираем самый длинный вариант, который влезает.
function buildMetaDesc(title: string, hookCap: string): string {
  const base = `Купить ${title} в Белгороде`;
  const tails = [
    ` — ${hookCap}. Гарантия, доставка и самовывоз. PhoneTrade.`,
    `. Гарантия, доставка по городу и самовывоз. PhoneTrade.`,
    `. Гарантия, доставка и самовывоз. PhoneTrade.`,
    `. Гарантия и доставка по Белгороду. PhoneTrade.`,
    `. Гарантия и доставка. PhoneTrade.`,
    `. Доставка и самовывоз.`,
    `.`,
  ];
  for (const t of tails) { const s = base + t; if (s.length <= 160) return s; }
  return trimWords(base, 159) + ".";
}

// Уникальный лид-абзац для description_html.
function buildLead(p: any): string {
  const t = String(p.title).trim();
  if (p.type === "used") {
    const raw = (p.condition_text && String(p.condition_text).trim()) || "отличное, проверено";
    const c = raw.replace(/\s+/g, " ").replace(/\.+$/, "");
    const condText = /^состояни/i.test(c) ? c : `состояние — ${c}`;
    const bat = p.battery != null ? `, аккумулятор ${p.battery}%` : "";
    return `<p><strong>${t}</strong> — проверенный Б/У: ${condText}${bat}. Купить в Белгороде: устройство проверено, действует гарантия магазина. Доставка по городу и самовывоз с ул. Попова, 36, рассрочка и Trade-in.</p>`;
  }
  return `<p><strong>${t}</strong> — ${hookFor(String(p.category_slug || ""), false)} с гарантией магазина и проверкой при выдаче. Купить в Белгороде: доставка по городу и самовывоз с ул. Попова, 36, рассрочка, кредит и Trade-in.</p>`;
}

const MARK = "<!--ul-->";

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("products")
    .select("id,title,category_slug,type,condition_text,battery,description_html")
    .is("deleted_at", null)
    .limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as any[];

  let n = 0, mtFixed = 0, mdFixed = 0, leadFixed = 0;
  for (const p of rows) {
    const title = String(p.title).trim();
    const isUsed = p.type === "used";
    const hookCap = cap(hookFor(p.category_slug as string, isUsed));
    const meta_title = buildMetaTitle(title);
    const meta_description = buildMetaDesc(title, hookCap);

    // description_html: снять старый лид (если был) и поставить свежий.
    let body = String(p.description_html || "");
    const i = body.indexOf(MARK);
    if (i >= 0) body = body.slice(i + MARK.length);
    const description_html = body.trim().length > 0 ? `${buildLead(p)}${MARK}${body}` : body;

    if (meta_title.length > 60) console.warn(`! mt>60 ${p.id}: ${meta_title.length}`);
    if (meta_description.length > 160) console.warn(`! md>160 ${p.id}: ${meta_description.length}`);

    await db.from("products").update({ meta_title, meta_description, description_html, updated_at: new Date().toISOString() }).eq("id", p.id);
    n++;
    if (meta_title.length <= 60) mtFixed++;
    if (meta_description.length <= 160) mdFixed++;
    if (description_html.includes(MARK)) leadFixed++;
  }
  console.log(`Готово: товаров=${n}, meta_title≤60=${mtFixed}, meta_description≤160=${mdFixed}, лид добавлен=${leadFixed}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
