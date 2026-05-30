/**
 * SEO-заполнение карточек: краткое описание (≤3 строк) + meta_title +
 * meta_description для всех товаров. Ключи под Белгород: купить, заказать,
 * цена, гарантия, доставка, самовывоз. Конкурентов не упоминаем.
 * Полное HTML-описание заполняется отдельно (агентами по моделям).
 * Запуск: npx tsx scripts/seo-fill.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

const fmtPrice = (n: number | null) => (n ? `${Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ")} ₽` : null);

// Категория → как называем тип товара в тексте
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
  return "оригинальный аксессуар Apple";
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("products")
    .select("id,title,category_slug,type,price_cash,condition_text,battery")
    .is("deleted_at", null)
    .limit(5000);
  if (error) throw error;
  const rows = data ?? [];
  let n = 0;
  for (const p of rows as any[]) {
    const title = String(p.title).trim();
    const isUsed = p.type === "used";
    const hook = hookFor(p.category_slug as string, isUsed);
    const price = fmtPrice(p.price_cash);
    const used = isUsed
      ? ` Состояние: ${p.condition_text && String(p.condition_text).trim() ? String(p.condition_text).trim() : "отличное, проверено"}${p.battery != null ? `, аккумулятор ${p.battery}%` : ""}.`
      : "";

    const short_description =
      `${title} — ${hook}. Купить и заказать в Белгороде: ${price ? `цена ${price} наличными, ` : ""}гарантия, проверка перед выдачей, доставка по городу и самовывоз.${used}`.slice(0, 320);

    const meta_title = `${title} — купить в Белгороде`.slice(0, 70);

    const meta_description =
      `Купить ${title} в Белгороде${price ? ` по цене ${price}` : ""}. ${hook[0].toUpperCase() + hook.slice(1)}. Гарантия, доставка по городу и самовывоз. Заказать в PhoneTrade — техника в наличии.`.slice(0, 300);

    await db.from("products").update({ short_description, meta_title, meta_description, updated_at: new Date().toISOString() }).eq("id", p.id);
    n++;
  }
  console.log(`SEO короткое+meta заполнено: ${n} товаров`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
