/**
 * Контент карточек Dyson: short_description + meta_title(≤60) + meta_description(≤160)
 * + description_html (модельная копия + уникальный per-unit лид по цвету).
 * Локальное SEO Белгород (купить/заказать/цена/гарантия/доставка/самовывоз),
 * конкурентов не упоминаем. Также добавляет цвета Dyson в реестр опций
 * (shop_settings.product_options → color.values) для админки.
 * Идемпотентно. Запуск: npx tsx scripts/dyson-content.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

type Line = "airwrap" | "supersonic" | "airstrait";

// Модельная копия (общий блок по линейке) — HTML.
const MODEL_BODY: Record<Line, string> = {
  airwrap: `<h2>Мультистайлер Dyson Airwrap</h2>
<p>Dyson Airwrap укладывает, завивает, разглаживает и подсушивает волосы потоком воздуха за счёт эффекта Коанда — без экстремального нагрева, который повреждает структуру волоса. Интеллектуальный контроль температуры измеряет поток до 40 раз в секунду и удерживает щадящий режим, сохраняя естественный блеск.</p>
<ul>
<li>Эффект Коанда — завивка и укладка воздухом, без щипцов</li>
<li>Интеллектуальный контроль температуры — защита от перегрева</li>
<li>Сменные насадки в комплекте для разных типов укладки</li>
<li>Цифровой мотор Dyson V9 — мощный и тихий</li>
</ul>`,
  supersonic: `<h2>Фен Dyson Supersonic</h2>
<p>Dyson Supersonic сушит быстро и бережно: цифровой мотор Dyson нагнетает мощный направленный поток, а интеллектуальный контроль температуры измеряет нагрев до 40 раз в секунду и не даёт волосам перегреваться. Лёгкий, сбалансированный корпус и магнитные насадки для точной укладки.</p>
<ul>
<li>Цифровой мотор Dyson — быстрая сушка</li>
<li>Интеллектуальный контроль температуры — блеск без перегрева</li>
<li>Магнитные насадки в комплекте</li>
<li>Сбалансированный, тихий, лёгкий корпус</li>
</ul>`,
  airstrait: `<h2>Выпрямитель Dyson Airstrait</h2>
<p>Dyson Airstrait выпрямляет волосы направленным потоком воздуха — без горячих пластин. Две воздушные струи собирают и вытягивают прядь, работая по влажным и сухим волосам (режим wet-to-dry), а интеллектуальный контроль температуры бережёт волос от перегрева.</p>
<ul>
<li>Выпрямление воздухом — без горячих пластин</li>
<li>Режим wet-to-dry — сушит и выпрямляет за один проход</li>
<li>Интеллектуальный контроль температуры — меньше теплового повреждения</li>
<li>Цифровой мотор Dyson — мощный и тихий</li>
</ul>`,
};

const SUBTYPE: Record<Line, string> = {
  airwrap: "мультистайлер Dyson Airwrap",
  supersonic: "фен Dyson Supersonic",
  airstrait: "выпрямитель Dyson Airstrait",
};

type Item = {
  id: string;
  line: Line;
  short: string;      // короткое имя для meta (модель + цвет)
  colorRu: string;    // цвет по-русски (для лида)
  withCase: boolean;
  lead: string;       // уникальный per-unit лид (про цвет/исполнение)
};

const ITEMS: Item[] = [
  // Airwrap
  { id: "dyson-airwrap-hs08-jasper-plum", line: "airwrap", short: "Dyson Airwrap HS08 Jasper Plum", colorRu: "сливовый Jasper Plum", withCase: false,
    lead: "Исполнение HS08 в насыщенном сливовом оттенке Jasper Plum — последнее поколение Airwrap с обновлёнными насадками." },
  { id: "dyson-airwrap-hs08-ceramic-pink", line: "airwrap", short: "Dyson Airwrap HS08 Ceramic Pink", colorRu: "керамический розовый Ceramic Pink", withCase: false,
    lead: "Поколение HS08 в нежном керамическо-розовом цвете Ceramic Pink с золотистыми насадками." },
  { id: "dyson-airwrap-hs05-diffuse-strawberry", line: "airwrap", short: "Dyson Airwrap HS05 Strawberry", colorRu: "клубнично-розовый Strawberry", withCase: false,
    lead: "Версия HS05 в тёплом клубнично-розовом оттенке Strawberry Bronze." },
  { id: "dyson-airwrap-hs05-nickel-copper", line: "airwrap", short: "Dyson Airwrap HS05 Nickel/Copper", colorRu: "никель/медь", withCase: false,
    lead: "Классическое исполнение HS05 в благородном сочетании никеля и меди (Nickel/Copper)." },
  { id: "dyson-airwrap-hs05-fuchsia-nickel", line: "airwrap", short: "Dyson Airwrap HS05 Fuchsia", colorRu: "фуксия/никель", withCase: false,
    lead: "Яркая версия HS05 в цвете фуксия с никелевыми насадками (Fuchsia/Nickel)." },
  { id: "dyson-airwrap-hs05-blue-blush", line: "airwrap", short: "Dyson Airwrap HS05 Blue/Blush", colorRu: "синий/розовый", withCase: false,
    lead: "Лимитированное сочетание HS05 — синий корпус с розовыми насадками (Blue/Blush)." },
  { id: "dyson-airwrap-hs05-blue-copper", line: "airwrap", short: "Dyson Airwrap HS05 Blue/Copper", colorRu: "синий/медь", withCase: false,
    lead: "Исполнение HS05 в глубоком синем цвете с медными насадками (Blue/Copper)." },
  // Supersonic
  { id: "dyson-supersonic-hd08-vinca-blue", line: "supersonic", short: "Dyson Supersonic HD08 Vinca Blue", colorRu: "синий Vinca Blue", withCase: true,
    lead: "Поколение HD08 в спокойном синем оттенке Vinca Blue. В комплекте — фирменный кейс для хранения." },
  { id: "dyson-supersonic-hd07-fuchsia-nickel", line: "supersonic", short: "Dyson Supersonic HD07 Fuchsia", colorRu: "фуксия/никель", withCase: false,
    lead: "Версия HD07 в ярком цвете фуксия с никелем (Fuchsia/Nickel)." },
  { id: "dyson-supersonic-hd08-nickel-copper", line: "supersonic", short: "Dyson Supersonic HD08 Nickel/Copper", colorRu: "никель/медь", withCase: false,
    lead: "Исполнение HD08 в классическом сочетании никеля и меди (Nickel/Copper)." },
  { id: "dyson-supersonic-nural-hd16-vinca-blue", line: "supersonic", short: "Dyson Supersonic Nural HD16", colorRu: "синий Vinca Blue/Topaz", withCase: true,
    lead: "Новейшее поколение Supersonic Nural (HD16) с датчиком близости к коже головы, цвет Vinca Blue/Topaz. В комплекте — кейс." },
  // Airstrait (модель HT01 — air-выпрямитель, без горячих пластин)
  { id: "dyson-corrale-ht01-nickel-copper", line: "airstrait", short: "Dyson Airstrait HT01 Nickel/Copper", colorRu: "никель/медь", withCase: false,
    lead: "Выпрямитель Airstrait HT01 в благородном цвете никель/медь (Nickel/Copper)." },
  { id: "dyson-corrale-ht01-kanzan-pink", line: "airstrait", short: "Dyson Airstrait HT01 Kanzan Pink", colorRu: "розовый Kanzan Pink", withCase: true,
    lead: "Airstrait HT01 в розовом оттенке Kanzan Pink. В комплекте — кейс для хранения." },
  { id: "dyson-corrale-ht01-red-velvet-case", line: "airstrait", short: "Dyson Airstrait HT01 Red Velvet", colorRu: "красный Red Velvet", withCase: true,
    lead: "Airstrait HT01 в насыщенном красном цвете Red Velvet. В комплекте — кейс для хранения." },
  { id: "dyson-corrale-ht01-red-velvet", line: "airstrait", short: "Dyson Airstrait HT01 Red Velvet", colorRu: "красный Red Velvet", withCase: false,
    lead: "Airstrait HT01 в насыщенном красном цвете Red Velvet." },
];

const fmtPrice = (n: number | null) => (n ? `${Math.round(n).toLocaleString("ru-RU")} ₽` : null);
const clamp = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,.;–—-]+$/, "") + "…");

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // Цены для текстов
  const { data: prices } = await db.from("products").select("id,price_cash").in("id", ITEMS.map((i) => i.id));
  const priceById = new Map((prices ?? []).map((r: any) => [r.id, Number(r.price_cash)]));

  let n = 0;
  for (const it of ITEMS) {
    const price = fmtPrice(priceById.get(it.id) ?? null);
    const caseNote = it.withCase ? " В комплекте фирменный кейс." : "";

    const short_description = clamp(
      `${SUBTYPE[it.line][0].toUpperCase() + SUBTYPE[it.line].slice(1)}, цвет ${it.colorRu}. Купить в Белгороде${price ? `: цена ${price} наличными` : ""} — гарантия, проверка перед выдачей, доставка по городу и самовывоз.${caseNote}`,
      320
    );

    const meta_title = clamp(`${it.short} — купить в Белгороде`, 60);

    const meta_description = clamp(
      `Купить ${it.short}${price ? ` в Белгороде по цене ${price}` : " в Белгороде"}. Оригинал, гарантия, доставка и самовывоз. Заказать в PhoneTrade.`,
      160
    );

    const description_html =
      `<p>${it.lead}${caseNote}</p>\n${MODEL_BODY[it.line]}\n` +
      `<p>Купить ${it.short} в Белгороде${price ? ` по цене ${price} наличными` : ""}: оригинальное устройство, гарантия, проверка перед выдачей, доставка по городу и самовывоз в Универмаге «Белгород», ул. Попова, 36.</p>`;

    const { error } = await db
      .from("products")
      .update({ short_description, meta_title, meta_description, description_html, updated_at: new Date().toISOString() })
      .eq("id", it.id);
    if (error) throw error;
    n++;
    console.log(`✓ ${it.id} — meta_title ${meta_title.length}, meta_desc ${meta_description.length}`);
  }

  // Добавить цвета Dyson в реестр опций (color.values) — для админки/единообразия.
  const DYSON_COLORS = ["Сливовый", "Никель/медь", "Фуксия/никель", "Синий/медь"];
  const { data: optRow } = await db.from("shop_settings").select("value").eq("key", "product_options").maybeSingle();
  const opts = (optRow?.value as any[]) ?? [];
  const color = opts.find((o) => o.key === "color");
  if (color) {
    const set = new Set<string>(color.values ?? []);
    let added = 0;
    for (const c of DYSON_COLORS) if (!set.has(c)) { set.add(c); added++; }
    color.values = [...set];
    if (added > 0) {
      const { error } = await db.from("shop_settings").update({ value: opts }).eq("key", "product_options");
      if (error) throw error;
      console.log(`Добавлено цветов в реестр опций: ${added}`);
    } else {
      console.log("Цвета Dyson уже в реестре опций");
    }
  }

  console.log(`\nГотово: контент заполнен у ${n} товаров Dyson.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
