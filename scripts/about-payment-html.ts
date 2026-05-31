/**
 * Переносит дизайн /about и /payment в редактируемый HTML (static_pages),
 * инлайн-стили + .not-prose — рендерится так же, но правится в админке «Страницы».
 * Запуск: npx tsx scripts/about-payment-html.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const BASE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content";
const STORE = `${BASE}/store-belgorod.jpg`;
const TBANK = `${BASE}/t-bank.svg`;
const INSTALLMENT = `${BASE}/installment.png`;
const MAP_LINK =
  "https://yandex.ru/maps/?text=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%2C%20%D1%83%D0%BB.%20%D0%9F%D0%BE%D0%BF%D0%BE%D0%B2%D0%B0%2C%2036";
const MAP_SRC =
  "https://yandex.ru/map-widget/v1/?ll=36.594843%2C50.595414&z=17&mode=search&text=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%2C%20%D1%83%D0%BB.%20%D0%9F%D0%BE%D0%BF%D0%BE%D0%B2%D0%B0%2C%2036";

const CARD = "border:1px solid rgba(0,0,0,0.10);border-radius:24px;padding:32px;background:#fff";
const CHIP =
  "display:inline-flex;width:46px;height:46px;align-items:center;justify-content:center;border-radius:14px;background:#f5f5f7;color:#1d1d1f";
const BTN_PRIMARY =
  "display:inline-flex;align-items:center;height:48px;padding:0 28px;border-radius:999px;background:#1d1d1f;color:#fff;font-size:14px;font-weight:500;text-decoration:none";
const BTN_OUTLINE =
  "display:inline-flex;align-items:center;height:48px;padding:0 28px;border-radius:999px;border:1px solid rgba(0,0,0,0.15);color:#1d1d1f;font-size:14px;font-weight:500;text-decoration:none";

const svg = (p: string, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

const I = {
  shield: svg('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
  wrench: svg('<path d="M14.7 6.3a4 4 0 0 0-5.66 5.66l-6.04 6.04a2 2 0 1 0 2.83 2.83l6.04-6.04a4 4 0 0 0 5.66-5.66l-2.47 2.47-2.83-2.83z"/>'),
  truck: svg('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'),
  card: svg('<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>'),
  swap: svg('<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>'),
  heart: svg('<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 15 6 6"/><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.7 2.7 0 0 0 16 4a2.7 2.7 0 0 0-5 1.8c0 1.1.8 2 1.5 2.7L16 12z"/>'),
  pin: svg('<path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>', 20),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 20),
  phone: svg('<path d="M13.83 19a16 16 0 0 1-8.83-8.83 2 2 0 0 1 .54-2.24l1.3-1.1a1.27 1.27 0 0 0 .38-1.42L6.5 3.4A1.27 1.27 0 0 0 5.18 2.7L3 3a2 2 0 0 0-1.66 2.31A19 19 0 0 0 18.69 22.66 2 2 0 0 0 21 21l.3-2.18a1.27 1.27 0 0 0-.7-1.32l-2-1.05a1.27 1.27 0 0 0-1.42.38l-1.1 1.3"/>', 18),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 14),
  tg: svg('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>', 18),
  wa: svg('<path d="M13.83 19a16 16 0 0 1-8.83-8.83 2 2 0 0 1 .54-2.24l1.3-1.1a1.27 1.27 0 0 0 .38-1.42L6.5 3.4A1.27 1.27 0 0 0 5.18 2.7L3 3a2 2 0 0 0-1.66 2.31A19 19 0 0 0 18.69 22.66 2 2 0 0 0 21 21l.3-2.18a1.27 1.27 0 0 0-.7-1.32l-2-1.05a1.27 1.27 0 0 0-1.42.38l-1.1 1.3"/>', 18),
};

const GRID = (min: string) =>
  `display:grid;grid-template-columns:repeat(auto-fit,minmax(${min},1fr));gap:24px`;
const TILES_WRAP =
  "display:grid;gap:1px;background:rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.08);border-radius:24px;overflow:hidden";

const STATS = [
  ["10+ лет", "работаем в Белгороде"],
  ["300+", "моделей в наличии"],
  ["0-0-0", "рассрочка от Т-Банк"],
  ["Свой", "сервисный центр"],
];
const FEATURES: [string, string, string][] = [
  [I.shield, "Только оригинал", "Каждое устройство проходит проверку подлинности. Серийный номер можно сверить с базой Apple прямо в магазине."],
  [I.wrench, "Свой сервис в Белгороде", "Диагностика и ремонт на месте — без отправки в другие города и долгого ожидания запчастей."],
  [I.truck, "Доставка и самовывоз", "Забрать заказ можно в Универмаге «Белгород» или оформить доставку по Белгороду и всей России."],
  [I.card, "Рассрочка и оплата картой", "Наличные, банковские карты VISA / MasterCard / МИР и рассрочка от Т-Банк до 36 месяцев."],
  [I.swap, "Trade-in с зачётом", "Принимаем iPhone, iPad, Mac, Watch и AirPods — сумма обмена сразу учитывается в покупке."],
  [I.heart, "Поддержка после покупки", "Настроим Apple ID, перенесём данные, поможем по гарантии. Звоните или приходите в магазин."],
];
const SOCIAL_BTN =
  "display:inline-flex;width:46px;height:46px;align-items:center;justify-content:center;border-radius:14px;background:#f5f5f7;color:#1d1d1f;text-decoration:none";

const ABOUT = `<div class="not-prose" style="color:#1d1d1f">
<div style="${GRID("300px")};gap:40px;align-items:center;margin-bottom:56px">
<div>
<p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0;max-width:36rem">PhoneTrade — магазин оригинальной техники Apple в Белгороде. У нас можно купить iPhone, iPad, MacBook, Apple Watch, AirPods и оригинальные аксессуары с официальной гарантией. Все устройства проходят проверку, имеют подтверждённую оригинальность и поддерживаются нашим собственным сервисным центром.</p>
<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:26px">
<a href="/catalog" style="${BTN_PRIMARY}">Смотреть каталог</a>
<a href="/trade-in" style="${BTN_OUTLINE}">Оценить Trade-in</a>
</div>
</div>
<div><img src="${STORE}" alt="Магазин Phone Trade в Белгороде — ул. Попова, 36" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:24px;border:1px solid rgba(0,0,0,0.08);display:block;margin:0" /></div>
</div>

<div style="${TILES_WRAP};grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:64px">
${STATS.map(([v, l]) => `<div style="background:#fff;padding:24px;text-align:center"><div style="font-size:28px;font-weight:600;letter-spacing:-.01em">${v}</div><div style="font-size:13px;color:#6e6e73;margin-top:4px">${l}</div></div>`).join("")}
</div>

<h2 style="font-size:clamp(24px,3vw,34px);font-weight:600;letter-spacing:-.02em;margin:0 0 8px">Почему покупают у нас</h2>
<p style="color:#6e6e73;max-width:44rem;margin:0 0 32px;line-height:1.6">Благодаря прямым поставкам цены ниже среднерыночных, а постоянные покупатели получают накопительные скидки и бонусы. При комплексной покупке — дополнительная выгода.</p>
<div style="${TILES_WRAP};grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:64px">
${FEATURES.map(([ic, t, d]) => `<div style="background:#fff;padding:28px"><span style="${CHIP}">${ic}</span><h3 style="font-size:16px;font-weight:600;margin:16px 0 0">${t}</h3><p style="font-size:14px;line-height:1.6;color:#6e6e73;margin:8px 0 0">${d}</p></div>`).join("")}
</div>

<div style="text-align:center;max-width:48rem;margin:0 auto 64px">
<h2 style="font-size:clamp(24px,3vw,34px);font-weight:600;letter-spacing:-.02em;margin:0">Команда с опытом и честным сервисом</h2>
<p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:20px 0 0">У нас работает команда специалистов с большим опытом. Более десяти лет мы помогаем жителям Белгорода выбирать технику Apple и заботимся о ней после покупки. Наша успешная работа подтверждается отзывами и рекомендациями — и мы постоянно ищем, как стать лучше.</p>
<p style="font-size:13px;color:#86868b;margin:24px 0 0">* Актуальную цену и наличие интересующей вас модели уточняйте в сообщениях или по телефону.</p>
</div>

<div style="${GRID("300px")};gap:40px;align-items:start">
<div>
<h2 style="font-size:clamp(24px,3vw,34px);font-weight:600;letter-spacing:-.02em;margin:0 0 24px">Контакты</h2>
<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px"><span style="${SOCIAL_BTN};background:transparent;border:1px solid rgba(0,0,0,0.12)">${I.pin}</span><span style="padding-top:10px">Белгород, ул. Попова, 36 (Универмаг «Белгород», 1 этаж)</span></div>
<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px"><span style="${SOCIAL_BTN};background:transparent;border:1px solid rgba(0,0,0,0.12)">${I.clock}</span><span style="padding-top:10px">Ежедневно 10:00–20:00</span></div>
<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:24px"><span style="${SOCIAL_BTN};background:transparent;border:1px solid rgba(0,0,0,0.12)">${I.phone}</span><a href="tel:+79040988877" style="padding-top:10px;color:#1d1d1f;font-weight:500;text-decoration:none">+7 (904) 098-88-77</a></div>
<p style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6e6e73;margin:0 0 12px">Мы на связи</p>
<div style="display:flex;gap:10px;margin-bottom:28px">
<a href="https://t.me/phonetradebel" target="_blank" rel="noopener" aria-label="Telegram" style="${SOCIAL_BTN}">${I.tg}</a>
<a href="https://wa.me/79040988877" target="_blank" rel="noopener" aria-label="WhatsApp" style="${SOCIAL_BTN}">${I.wa}</a>
<a href="https://vk.com/phonetradebel" target="_blank" rel="noopener" aria-label="ВКонтакте" style="${SOCIAL_BTN};font-weight:700;font-size:13px">VK</a>
</div>
<div style="display:flex;flex-wrap:wrap;gap:12px">
<a href="${MAP_LINK}" target="_blank" rel="noopener" style="${BTN_PRIMARY}">Построить маршрут</a>
<a href="/catalog" style="${BTN_OUTLINE}">В каталог</a>
</div>
</div>
<a href="${MAP_LINK}" target="_blank" rel="noopener" aria-label="Открыть на Яндекс.Картах" style="display:block;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,0.08)">
<iframe src="${MAP_SRC}" title="PhoneTrade на карте — Белгород, ул. Попова, 36" loading="lazy" style="display:block;width:100%;height:380px;border:0;filter:grayscale(0.15) contrast(0.95)" referrerpolicy="no-referrer-when-downgrade"></iframe>
</a>
</div>
</div>`;

const payWhere = `<p style="font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#6e6e73;margin:20px 0 0">Где оплатить</p>
<div style="display:flex;gap:12px;align-items:flex-start;margin-top:12px;font-size:14px"><span style="color:#86868b;flex:none">${I.pin}</span><span>В нашем офисе продаж: Белгород, ул. Попова, 36 (Универмаг «Белгород», 1 этаж)</span></div>
<div style="display:flex;gap:12px;align-items:flex-start;margin-top:10px;font-size:14px"><span style="color:#86868b;flex:none">${I.truck}</span><span>При доставке товаров или оказании услуг</span></div>`;

const INSTALL = ["За 2 минуты", "От 3 до 36 месяцев", "Сумма покупки от 3 000 до 200 000 ₽", "Достаточно только паспорта", "Подписание с помощью СМС"];

const PAYMENT = `<div class="not-prose" style="color:#1d1d1f">
<p style="font-size:16px;line-height:1.6;color:#6e6e73;max-width:42rem;margin:0 0 40px">Оплатить покупку в PhoneTrade можно наличными, банковской картой или оформить рассрочку от Т-Банк прямо при заказе. Выберите подходящий способ — мы поможем на каждом шаге.</p>

<div style="${GRID("300px")};margin-bottom:48px">
<div style="${CARD}">
<span style="${CHIP}">${I.card}</span>
<h2 style="margin:16px 0 0;font-size:20px;font-weight:600">Наличный расчёт</h2>
<p style="font-size:15px;line-height:1.6;color:#6e6e73;margin:12px 0 0">Вы отдаёте деньги при получении товаров или оказании услуг и вместе с заказом получаете все необходимые документы и кассовый чек.</p>
${payWhere}
</div>
<div style="${CARD}">
<span style="${CHIP}">${I.card}</span>
<h2 style="margin:16px 0 0;font-size:20px;font-weight:600">Банковской картой</h2>
<p style="font-size:15px;line-height:1.6;color:#6e6e73;margin:12px 0 0">Мы используем платёжный шлюз ПАО «Сбербанк России» и принимаем к оплате карты VISA, MasterCard и МИР.</p>
${payWhere}
</div>
</div>

<div style="${CARD};padding:40px">
<div style="${GRID("280px")};gap:40px;align-items:center">
<div>
<img src="${TBANK}" alt="Т-Банк" style="height:52px;width:auto;margin:0" />
<h2 style="margin:20px 0 0;font-size:clamp(22px,3vw,30px);font-weight:600;letter-spacing:-.02em">Рассрочка от Т-Банк</h2>
<div style="margin-top:24px">
${INSTALL.map((t) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;font-size:15px"><span style="display:inline-flex;width:20px;height:20px;flex:none;align-items:center;justify-content:center;border-radius:999px;background:#1d1d1f;color:#fff">${I.check}</span><span>${t}</span></div>`).join("")}
</div>
<p style="font-size:12px;color:#86868b;margin:24px 0 0">0+ Рассрочка предоставляется АО «Т-Банк», лицензия №2673.</p>
</div>
<div><img src="${INSTALLMENT}" alt="Рассрочка 0-0-0 от Т-Банк" style="width:100%;max-width:360px;display:block;margin:0 auto" /></div>
</div>
</div>

<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:40px">
<a href="/catalog" style="${BTN_PRIMARY}">Выбрать технику</a>
<a href="/delivery" style="${BTN_OUTLINE}">О доставке</a>
</div>
</div>`;

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const updates = [
    {
      slug: "about",
      title: "Айфоны и техника Apple в Белгороде",
      content: ABOUT,
      meta_title: "О компании — техника Apple в Белгороде | PhoneTrade",
      meta_description: "PhoneTrade — магазин оригинальной техники Apple в Белгороде на ул. Попова, 36. iPhone, iPad, MacBook, Apple Watch и AirPods с гарантией, доставкой, рассрочкой и собственным сервисным центром.",
    },
    {
      slug: "payment",
      title: "Оплата и рассрочка",
      content: PAYMENT,
      meta_title: "Оплата и рассрочка — PhoneTrade Белгород",
      meta_description: "Способы оплаты в PhoneTrade: наличными, банковской картой (VISA, MasterCard, МИР) и рассрочка от Т-Банк до 36 месяцев. Техника Apple в Белгороде на удобных условиях.",
    },
  ];

  for (const u of updates) {
    const { error } = await db.from("static_pages").update({ title: u.title, content: u.content, meta_title: u.meta_title, meta_description: u.meta_description, status: "published", updated_at: new Date().toISOString() }).eq("slug", u.slug);
    console.log(error ? `✗ ${u.slug}: ${error.message}` : `✓ ${u.slug} — ${u.content.length} символов`);
  }
}

main().then(() => process.exit(0));
