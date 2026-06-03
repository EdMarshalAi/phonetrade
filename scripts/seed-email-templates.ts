/**
 * Сидинг 14 шаблонов писем PhoneTrade (docs/email-marketing.md §4).
 *
 * Модель: HTML — системный (Apple-стиль, inline-CSS, хедер 16:9), с плейсхолдерами
 * РЕДАКТИРУЕМОГО контента {{c.heading}}, {{c.body}}, {{c.cta_text}}, {{c.cta_url}},
 * {{c.header_image}} (правятся полями в админке, без HTML) и РАНТАЙМ-переменными
 * {{customer.*}}/{{order.*}}/{{cart.*}}/{{promo.*}} (подставляются при отправке).
 * Дефолтный контент кладётся в колонку content.
 *
 *   npx tsx scripts/seed-email-templates.ts --preview   # HTML-превью, без БД
 *   npx tsx scripts/seed-email-templates.ts             # засеять в email_templates
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://phonetrade31.ru";
const HEADER_BASE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/email/headers/";
const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const BORDER = "#e5e5ea";
const SALE = "#e30000";
const ADDRESS = "Белгород, ул. Попова, 36 (Универмаг Белгород, 1 этаж)";
const PHONE = "+7 (904) 098-88-77";

// Юридическая категория (consent-правила). transactional — всегда; service —
// без согласия маркетинга, но с отпиской; marketing — только с согласием.
function legalCategory(slug: string): "transactional" | "service" | "marketing" {
  if (slug === "order_confirmation" || slug === "order_shipped") return "transactional";
  if (slug === "abandoned_cart_1" || slug === "review_request") return "service";
  return "marketing";
}

function headerKey(slug: string): string {
  if (slug.startsWith("welcome")) return "welcome";
  if (slug.startsWith("order")) return "order";
  if (slug.startsWith("abandoned_cart")) return "cart";
  if (slug === "review_request") return "review";
  if (slug === "cross_sell_iphone") return "crosssell";
  if (slug === "birthday") return "birthday";
  return "campaign";
}

type Cat = "transactional" | "marketing" | "trigger";
type Content = { heading: string; body: string; cta_text: string; cta_url: string; header_image: string };
type Tpl = {
  slug: string; name: string; category: Cat;
  subject: string; preview_text: string;
  content: Omit<Content, "header_image">;
  extra?: string;        // динамический блок между текстом и кнопкой (рантайм-переменные)
  showProducts?: boolean; // витрина реальных товаров {{products}} в теле письма
  productsLabel?: string;  // подпись над витриной
  noCta?: boolean;
  variables: string[];
};

// Карточки/строки товаров для превью (как в src/lib/email/product-cards.ts).
const IMP = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/imported/";
const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;
function prodCard(p: { img: string; title: string; cash: number; card: number }): string {
  return `<td width="50%" valign="top" style="padding:6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:14px;overflow:hidden;background:#fff;">
<tr><td style="text-align:center;padding:14px 10px 6px;"><img src="${p.img}" alt="" width="150" style="display:inline-block;width:150px;max-width:100%;height:auto;border:0;"></td></tr>
<tr><td style="padding:2px 14px 14px;"><div style="font-size:13px;font-weight:600;color:${INK};line-height:1.3;min-height:34px;">${p.title}</div>
<div style="margin-top:6px;font-size:16px;font-weight:700;color:${SALE};">${rub(p.cash)}</div><div style="font-size:12px;color:${MUTED};">${rub(p.card)} картой</div></td></tr></table></td>`;
}
const SAMPLE_PRODUCTS: { img: string; title: string; cash: number; card: number }[] = [
  { img: IMP + "iphone-17-pro-max-1tb-orange-1tb.jpg", title: "iPhone 17 Pro Max 1TB Orange", cash: 132000, card: 152000 },
  { img: IMP + "iphone-17-pro-1tb-orange-1tb.jpg", title: "iPhone 17 Pro 1TB Orange", cash: 130000, card: 149000 },
  { img: IMP + "iphone-17-pro-max-256gb-orange-dual-sim-256gb.jpg", title: "iPhone 17 Pro Max 256GB Orange", cash: 108000, card: 125000 },
  { img: IMP + "iphone-17-pro-512gb-orange-512gb.jpg", title: "iPhone 17 Pro 512GB Orange", cash: 107000, card: 124000 },
];
function prodCardsHtml(): string {
  let cells = "";
  SAMPLE_PRODUCTS.forEach((p, i) => { cells += prodCard(p); if (i % 2 === 1 && i < SAMPLE_PRODUCTS.length - 1) cells += "</tr><tr>"; });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 2px;"><tr>${cells}</tr></table>`;
}
const itemRowsHtml = SAMPLE_PRODUCTS.slice(0, 1).map((p) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${BORDER};"><tr>
<td width="60" valign="middle" style="padding:8px 12px 8px 0;"><img src="${p.img}" alt="" width="52" style="display:block;width:52px;height:52px;border:1px solid ${BORDER};border-radius:8px;background:#fff;"></td>
<td valign="middle" style="font-size:14px;color:${INK};">${p.title} <span style="color:${MUTED};">× 1</span></td>
<td valign="middle" align="right" style="font-size:14px;font-weight:600;white-space:nowrap;">${rub(p.cash)}</td></tr></table>`).join("");

// ── 14 шаблонов ────────────────────────────────────────────────────────────
const TEMPLATES: Tpl[] = [
  {
    slug: "welcome_1", name: "Welcome 1 — приветствие", category: "trigger",
    subject: "Добро пожаловать в PhoneTrade 👋",
    preview_text: "Оригинальная техника Apple в Белгороде — с гарантией и сервисом.",
    variables: ["customer.first_name"],
    content: {
      heading: "Здравствуйте, {{customer.first_name}}!",
      body: "Спасибо, что вы с PhoneTrade — магазином оригинальной техники Apple в Белгороде.\nУ нас только оригинал с проверкой по серийному номеру, собственный сервис, Trade-in и рассрочка. Нужен совет по выбору — просто ответьте на это письмо или позвоните.",
      cta_text: "Смотреть каталог", cta_url: "/catalog",
    },
    showProducts: true, productsLabel: "Хиты PhoneTrade",
  },
  {
    slug: "welcome_2", name: "Welcome 2 — помощь в выборе", category: "trigger",
    subject: "Какой iPhone выбрать? Короткий гид",
    preview_text: "17, Air, Pro или Pro Max — за минуту разберёмся, что вам подойдёт.",
    variables: ["customer.first_name"],
    content: {
      heading: "Подобрать iPhone за минуту",
      body: "{{customer.first_name}}, чтобы не теряться в линейке, вот короткий ориентир. Не уверены — напишите нам модель, которой пользуетесь сейчас, подскажем апгрейд под ваши задачи и бюджет.",
      cta_text: "Выбрать iPhone", cta_url: "/category/iphone",
    },
    showProducts: true, productsLabel: "Популярные модели",
    extra: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;font-size:14px;line-height:1.6;color:${INK};">
<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};"><b>iPhone 17</b> — для большинства: быстрый, отличная камера, разумная цена.</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};"><b>iPhone Air</b> — самый тонкий и лёгкий, для ценителей дизайна.</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};"><b>Pro / Pro Max</b> — максимум камеры, экрана и автономности.</td></tr></table>`,
  },
  {
    slug: "welcome_3", name: "Welcome 3 — Trade-in", category: "trigger",
    subject: "Сдайте старое устройство — получите скидку",
    preview_text: "Trade-in: оценим за 15 минут и вычтем из цены нового Apple.",
    variables: ["customer.first_name"],
    content: {
      heading: "Обменяйте старое на новое",
      body: "{{customer.first_name}}, ваш прежний смартфон может стать частью оплаты нового. Принимаем iPhone, iPad, Mac, Watch и AirPods.\nОценка за 15 минут, сумма сразу вычитается из стоимости покупки — без ожидания и скрытых условий.",
      cta_text: "Узнать сумму обмена", cta_url: "/trade-in",
    },
  },
  {
    slug: "order_confirmation", name: "Подтверждение заказа", category: "transactional",
    subject: "Заказ {{order.number}} принят — PhoneTrade",
    preview_text: "Мы получили ваш заказ. Менеджер скоро свяжется для подтверждения.",
    variables: ["customer.first_name", "order.number", "order.items", "order.total", "order.payment", "order.delivery"],
    content: {
      heading: "Заказ {{order.number}} принят",
      body: "Здравствуйте, {{customer.first_name}}! Спасибо за заказ — менеджер свяжется с вами для подтверждения.",
      cta_text: "Мои заказы", cta_url: "/account/orders",
    },
    extra: `<div style="margin:6px 0 12px;">{{order.items}}</div>
<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${INK};">Итого: {{order.total}}</p>
<p style="margin:0 0 4px;font-size:14px;color:${MUTED};">Оплата: {{order.payment}}</p>
<p style="margin:0;font-size:14px;color:${MUTED};">Получение: {{order.delivery}}</p>`,
  },
  {
    slug: "order_shipped", name: "Заказ отправлен / готов", category: "transactional",
    subject: "Заказ {{order.number}}: {{order.status}}",
    preview_text: "Хорошие новости по вашему заказу — детали внутри.",
    variables: ["customer.first_name", "order.number", "order.status", "order.tracking_number", "order.tracking_url"],
    content: {
      heading: "Ваш заказ {{order.status}}",
      body: "{{customer.first_name}}, статус заказа {{order.number}} обновлён.\nТрек-номер: {{order.tracking_number}}",
      cta_text: "Отследить заказ", cta_url: "{{order.tracking_url}}",
    },
  },
  {
    slug: "abandoned_cart_1", name: "Брошенная корзина 1 — напоминание", category: "trigger",
    subject: "Вы кое-что забыли в корзине",
    preview_text: "Ваши товары ещё на месте — вернитесь и завершите заказ.",
    variables: ["customer.first_name", "cart.items", "cart.total", "cart.url"],
    content: {
      heading: "Ваша корзина ждёт",
      body: "{{customer.first_name}}, вы не завершили оформление. Мы сохранили выбранное:",
      cta_text: "Вернуться к корзине", cta_url: "{{cart.url}}",
    },
    extra: `<div style="margin:6px 0 8px;">{{cart.items}}</div><p style="margin:0;font-size:15px;font-weight:700;color:${INK};">Сумма: {{cart.total}}</p>`,
  },
  {
    slug: "abandoned_cart_2", name: "Брошенная корзина 2 — подборка", category: "trigger",
    subject: "Эти товары всё ещё доступны",
    preview_text: "Напоминаем о вашем выборе — и пара похожих вариантов.",
    variables: ["customer.first_name", "cart.items", "cart.url"],
    content: {
      heading: "Не упустите свой выбор",
      body: "{{customer.first_name}}, товары из вашей корзины пока в наличии. Если остались вопросы по характеристикам или оплате — ответьте на это письмо, поможем определиться.",
      cta_text: "Оформить заказ", cta_url: "{{cart.url}}",
    },
    extra: `<div style="margin:6px 0 8px;">{{cart.items}}</div>`,
  },
  {
    slug: "review_request", name: "Запрос отзыва", category: "trigger",
    subject: "Как вам покупка, {{customer.first_name}}?",
    preview_text: "Пара слов от вас помогут другим — и нам стать лучше.",
    variables: ["customer.first_name"],
    content: {
      heading: "Поделитесь впечатлением",
      body: "{{customer.first_name}}, надеемся, новое устройство радует. Если всё понравилось — короткий отзыв очень поможет другим покупателям и нам. Что-то не так? Просто ответьте на это письмо.",
      cta_text: "Оставить отзыв на Яндекс.Картах", cta_url: "https://yandex.ru/maps/org/68859755553",
    },
  },
  {
    slug: "cross_sell_iphone", name: "Cross-sell к iPhone", category: "trigger",
    subject: "Защитите новый iPhone",
    preview_text: "Чехлы, защитные стёкла и зарядки — подобрали под вашу модель.",
    variables: ["customer.first_name"],
    content: {
      heading: "Аксессуары для вашего iPhone",
      body: "{{customer.first_name}}, чтобы новый iPhone дольше оставался как новый — стоит добавить чехол, защитное стекло и быструю зарядку.",
      cta_text: "Смотреть аксессуары", cta_url: "/category/accessories",
    },
    showProducts: true, productsLabel: "Заодно присмотритесь",
  },
  {
    slug: "campaign_promo", name: "Кампания — промо", category: "marketing",
    subject: "{{c.heading}}",
    preview_text: "Новинки и акции PhoneTrade.",
    variables: [],
    content: { heading: "Новинка уже в магазине", body: "Расскажите, что нового. Этот текст и заголовок задаются при создании кампании.", cta_text: "Смотреть", cta_url: "/catalog" },
    showProducts: true, productsLabel: "В наличии",
  },
  {
    slug: "campaign_newsletter", name: "Кампания — новости и новинки", category: "marketing",
    subject: "{{c.heading}}",
    preview_text: "Новости PhoneTrade.",
    variables: [],
    content: { heading: "Новости PhoneTrade", body: "Подборка новостей и новинок. Текст задаётся при создании кампании.", cta_text: "Подробнее", cta_url: "/catalog" },
    showProducts: true, productsLabel: "Новинки",
  },
  {
    slug: "campaign_minimal", name: "Кампания — минималистичная", category: "marketing",
    subject: "{{c.heading}}",
    preview_text: "Важное сообщение от PhoneTrade.",
    variables: [],
    content: { heading: "Коротко и по делу", body: "Минимум оформления — только текст и кнопка. Задаётся при создании кампании.", cta_text: "Открыть", cta_url: "/catalog" },
  },
];

const btn = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 6px;"><tr><td style="border-radius:980px;background:${INK};">
<a href="${href}" style="display:inline-block;padding:14px 30px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:980px;">${label}</a></td></tr></table>`;

/** Собирает системный HTML с плейсхолдерами {{c.*}} и рантайм-переменными. */
function layout(t: Tpl): string {
  const unsub = t.category === "transactional" ? "" :
    `<p style="margin:8px 0 0;font-size:12px;color:${MUTED};">Не хотите получать такие письма? <a href="{{unsubscribe_url}}" style="color:${MUTED};text-decoration:underline;">Отписаться</a></p>`;
  const cta = t.noCta ? "" : btn("{{c.cta_url}}", "{{c.cta_text}}");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.preview_text}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
<tr><td style="padding:22px 30px;border-bottom:1px solid ${BORDER};">
<span style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:${INK};">PhoneTrade</span>
<span style="font-size:12px;color:${MUTED};"> · Apple в Белгороде</span></td></tr>
<tr><td style="padding:0;border-bottom:1px solid ${BORDER};">
<img src="{{c.header_image}}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></td></tr>
<tr><td style="padding:30px;">
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${INK};">{{c.heading}}</h1>
{{c.body}}
${t.extra ?? ""}
${t.showProducts ? `<p style="margin:20px 0 2px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${t.productsLabel ?? "Популярное"}</p>{{products}}` : ""}
${cta}</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;line-height:1.6;">
${ADDRESS}<br>${PHONE} · <a href="${SITE}" style="color:${INK};text-decoration:none;">phonetrade31.ru</a>
${unsub}</td></tr>
</table></td></tr></table></body></html>`;
}

const toText = (t: Tpl) =>
  `${t.content.heading}\n\n${t.content.body}\n\n${t.content.cta_text}: ${t.content.cta_url}\n\n${ADDRESS}\n${PHONE}`
    .replace(/\{\{[^}]+\}\}/g, "").replace(/\n{3,}/g, "\n\n").trim();

// ── Превью (демо-данные) ────────────────────────────────────────────────────
const SAMPLE: Record<string, unknown> = {
  customer: { first_name: "Денис" },
  order: { number: "PT-2026-0042", total: "132 000 ₽", payment: "Картой", delivery: "Самовывоз (ул. Попова, 36)", status: "В пути", tracking_number: "CDEK-1234567", tracking_url: SITE, items: itemRowsHtml },
  cart: { total: "132 000 ₽", url: `${SITE}/cart`, items: itemRowsHtml },
  promo: { code: "CART1000" },
  products: prodCardsHtml(),
  unsubscribe_url: `${SITE}/unsubscribe?token=demo`,
};
function applyContentLocal(html: string, c: Content): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = (b: string) => b.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => `<p style="margin:0 0 15px;font-size:15px;line-height:1.6;color:${INK};">${esc(l)}</p>`).join("");
  return html
    .replace(/\{\{\s*c\.heading\s*\}\}/g, esc(c.heading))
    .replace(/\{\{\s*c\.body\s*\}\}/g, paras(c.body))
    .replace(/\{\{\s*c\.cta_text\s*\}\}/g, esc(c.cta_text))
    .replace(/\{\{\s*c\.cta_url\s*\}\}/g, c.cta_url.startsWith("/") ? SITE + c.cta_url : c.cta_url)
    .replace(/\{\{\s*c\.header_image\s*\}\}/g, c.header_image);
}
function render(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), vars);
    return v == null ? "" : String(v);
  });
}

function fullContent(t: Tpl): Content {
  return { ...t.content, header_image: `${HEADER_BASE}${headerKey(t.slug)}.png?v=3` };
}

function buildPreview() {
  const cards = TEMPLATES.map((t) => {
    const full = render(applyContentLocal(layout(t), fullContent(t)), SAMPLE);
    return `<section style="margin:0 0 40px;"><div style="font:600 14px -apple-system,sans-serif;color:#1d1d1f;">${t.name} · <span style="color:#6e6e73;font-weight:400;">${t.slug} · ${t.category}</span></div>
<iframe srcdoc="${full.replace(/"/g, "&quot;")}" style="width:600px;max-width:100%;height:620px;border:1px solid #e5e5ea;border-radius:12px;margin-top:8px;"></iframe></section>`;
  }).join("\n");
  writeFileSync("/tmp/email-templates-preview.html", `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:32px;background:#fff;"><h1 style="font:700 24px -apple-system;">Шаблоны писем (14)</h1>${cards}</body>`, "utf8");
  console.log("Превью: /tmp/email-templates-preview.html");
}

async function seed() {
  const raw = readFileSync(".env.local", "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  for (const t of TEMPLATES) {
    const { error } = await db.from("email_templates").upsert({
      slug: t.slug, name: t.name, category: t.category, subject: t.subject,
      preview_text: t.preview_text, html_content: layout(t), text_content: toText(t),
      content: fullContent(t), variables: t.variables, is_system: true, is_active: true,
      legal_category: legalCategory(t.slug),
      thumbnail_url: `${HEADER_BASE}${headerKey(t.slug)}.png?v=3`, updated_at: new Date().toISOString(),
    }, { onConflict: "slug" });
    console.log(error ? `✗ ${t.slug}: ${error.message}` : `✓ ${t.slug}`);
  }
}

if (process.argv.includes("--preview")) buildPreview();
else seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
