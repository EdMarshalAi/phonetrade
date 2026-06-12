/**
 * SEO-зашивка ключей по семантике (Белгород) поверх существующей меты.
 * Для КАЖДОГО товара:
 *  1) meta_description — пересборка ≤160 с ценой + русской памятью + интентом
 *     (купить/в наличии/рассрочка) + гео (Белгород + доставка по области) + CTA;
 *  2) description_html — добавляет идемпотентный SEO-блок (маркер <!--seo-kw-->):
 *     H2 с конфигурацией, естественный абзац с разговорными/транслит формами
 *     модели + память РУ + цена + интент, и FAQ (закрывает «сколько стоит / какие
 *     цвета и память / рассрочка / доставка» + даёт основу для FAQPage-schema).
 * meta_title не трогаем (уже ≤60 с «Белгород»). Конкурентов не упоминаем.
 * Запуск: npx tsx scripts/seo-embed-keywords.ts            (всё)
 *         npx tsx scripts/seo-embed-keywords.ts --sample   (5 шт, без записи)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}
loadEnv();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const SAMPLE = process.argv.includes("--sample");
const rub = (n: number | null) => (n ? `${Math.round(n).toLocaleString("ru-RU")} ₽` : "");
const memRU = (m: string | null) => {
  if (!m) return "";
  const s = m.toUpperCase().replace(/\s+/g, "");
  if (/^\d+TB$/.test(s)) return s.replace("TB", " ТБ");
  if (/^\d+GB$/.test(s)) return s.replace("GB", " ГБ");
  return m;
};
const memEN = (m: string | null) => (m || "").toUpperCase().replace(/\s+/g, "");

/** Разговорные/транслит формы модели: ru («айфон 17 про макс»), bare («17 про макс»), en. */
function modelForms(model: string, cat: string): { ru: string; bare: string; en: string } {
  const raw = (model || "").trim();
  const en = raw.toLowerCase();
  // iPhone
  if (/iphone/i.test(raw) || cat.startsWith("iphone")) {
    const tail = raw.replace(/iphone/i, "").trim();
    const ru = tail.replace(/\bpro\b/gi, "про").replace(/\bmax\b/gi, "макс").replace(/\bplus\b/gi, "плюс").replace(/\bmini\b/gi, "мини").replace(/\bair\b/gi, "эйр").replace(/\s+/g, " ").trim().toLowerCase();
    return { ru: `айфон ${ru}`.trim(), bare: ru, en };
  }
  if (/samsung|galaxy/i.test(raw) || cat.startsWith("samsung")) {
    const ru = raw.replace(/samsung/i, "самсунг").replace(/galaxy/i, "галакси").replace(/ultra/i, "ультра").replace(/\s+/g, " ").trim().toLowerCase();
    return { ru, bare: ru.replace("самсунг ", "").replace("галакси ", ""), en };
  }
  if (cat === "ipad") return { ru: raw.toLowerCase().replace("ipad", "айпад"), bare: "планшет " + raw.toLowerCase(), en };
  if (cat === "mac") return { ru: raw.toLowerCase().replace("macbook", "макбук"), bare: "ноутбук " + raw.toLowerCase(), en };
  if (cat === "watch") return { ru: raw.toLowerCase(), bare: "часы " + raw.toLowerCase(), en };
  if (cat === "airpods") return { ru: raw.toLowerCase(), bare: "наушники " + raw.toLowerCase(), en };
  return { ru: raw.toLowerCase(), bare: raw.toLowerCase(), en };
}

function clamp(s: string, n: number): string { return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…"; }

function buildMetaDesc(p: any): string {
  const price = rub(p.price_cash);
  const mem = memRU(p.memory);
  const conf = [p.model, mem, p.color].filter(Boolean).join(" ");
  // цена + гео + интент + CTA, ≤160
  const variants = [
    `Купить ${conf} в Белгороде${price ? ` за ${price}` : ""}. Оригинал, гарантия, рассрочка, доставка по городу и области, самовывоз — ул. Попова, 36.`,
    `${conf} в наличии в Белгороде${price ? ` — ${price}` : ""}. Оригинал, гарантия, рассрочка и Trade-in, доставка по области, самовывоз. Звоните!`,
  ];
  const idx = (p.id || "").length % variants.length;
  return clamp(variants[idx], 160);
}

function buildSeoBlock(p: any): string {
  const f = modelForms(p.model || p.title, p.category_slug || "");
  const mem = memRU(p.memory), memU = memEN(p.memory);
  const price = rub(p.price_cash);
  const color = p.color || "";
  const confTitle = [p.model, mem, color].filter(Boolean).join(" ");
  const isIphone = (p.category_slug || "").startsWith("iphone");
  const isUsed = p.type === "used";

  const lead = isIphone
    ? `Хотите купить ${f.ru}${mem ? ` на ${mem}` : ""}${color ? ` в цвете «${color}»` : ""} в Белгороде? У нас ${f.bare}${memU ? ` (${memU})` : ""} — ${isUsed ? "проверенный Б/У с гарантией" : "оригинальный, новый, с гарантией"}${price ? `, цена за наличные — ${price}` : ""}. Доступны рассрочка и Trade-in, доставка по Белгороду и области (Старый Оскол, Губкин, Шебекино) и самовывоз — ул. Попова, 36.`
    : `Купить ${f.ru}${mem ? ` ${mem}` : ""}${color ? `, цвет «${color}»` : ""} в Белгороде${price ? ` — ${price}` : ""}. Оригинал, гарантия, рассрочка, доставка по городу и области, самовывоз (ул. Попова, 36).`;

  const faq = [
    `<p><strong>Сколько стоит ${f.bare}${mem ? ` ${mem}` : ""} в Белгороде?</strong> Цена за наличные — ${price || "уточняйте"}; доступны рассрочка и оплата картой.</p>`,
    isIphone ? `<p><strong>Это оригинал?</strong> Да, ${isUsed ? "проверенный Б/У" : "новый оригинальный"} ${f.ru} с проверкой по серийному номеру и гарантией.</p>` : `<p><strong>Это оригинал?</strong> Да, оригинальная техника с гарантией.</p>`,
    `<p><strong>Доставка и самовывоз?</strong> Доставка по Белгороду и области, самовывоз — ул. Попова, 36. Trade-in: примем ваше старое устройство в зачёт.</p>`,
  ].join("\n");

  return `\n<!--seo-kw-->\n<h2>${confTitle} — купить в Белгороде</h2>\n<p>${lead}</p>\n<h3>Частые вопросы</h3>\n${faq}\n<!--/seo-kw-->`;
}

function stripBlock(html: string): string {
  return (html || "").replace(/\n?<!--seo-kw-->[\s\S]*?<!--\/seo-kw-->/g, "").trimEnd();
}

async function main() {
  let from = 0; const page = 1000; const all: any[] = [];
  for (;;) {
    const { data, error } = await db.from("products")
      .select("id,title,model,memory,color,price_cash,category_slug,type,status,meta_description,description_html")
      .eq("status", "published").is("deleted_at", null)
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    all.push(...data); from += page;
    if (data.length < page) break;
  }
  console.log(`Товаров к обработке: ${all.length}`);

  const sample = SAMPLE ? all.filter((p) => (p.category_slug || "").startsWith("iphone")).slice(0, 5) : all;
  let done = 0;
  for (const p of sample) {
    const metaDesc = buildMetaDesc(p);
    const body = stripBlock(p.description_html || "") + buildSeoBlock(p);
    if (SAMPLE) {
      console.log(`\n── ${p.id} ──`);
      console.log("META:", metaDesc, `(${metaDesc.length})`);
      console.log("BLOCK:", buildSeoBlock(p).replace(/\n/g, " ").slice(0, 320), "…");
      continue;
    }
    const { error } = await db.from("products").update({ meta_description: metaDesc, description_html: body }).eq("id", p.id);
    if (error) { console.error(p.id, error.message); continue; }
    done++;
    if (done % 50 === 0) console.log(`  ...${done}/${all.length}`);
  }
  if (!SAMPLE) console.log(`Готово: обновлено ${done} товаров.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
