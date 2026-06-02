/**
 * Сидинг 14 шаблонов писем PhoneTrade (docs/email-marketing.md §4).
 * Apple-эстетика: серый фон #f5f5f7, белый контент, чёрный CTA rounded.
 * Inline-CSS (почтовики срезают <style>). Копирайт — по скиллам copywriting +
 * email-sequence (одно письмо = одна задача, выгода прежде фич, тёплый тон).
 *
 *   npx tsx scripts/seed-email-templates.ts --preview   # собрать HTML-превью, без БД
 *   npx tsx scripts/seed-email-templates.ts             # засеять в email_templates
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://phonetrade31.ru";
const HEADER_BASE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/email/headers/";

/** Ключ хедер-картинки (9:16) по slug шаблона. Генерация — higgsfield, Storage. */
function headerKey(slug: string): string {
  if (slug.startsWith("welcome")) return "welcome";
  if (slug.startsWith("order")) return "order";
  if (slug.startsWith("abandoned_cart")) return "cart";
  if (slug === "review_request") return "review";
  if (slug === "cross_sell_iphone") return "crosssell";
  if (slug === "birthday") return "birthday";
  return "campaign";
}
const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const BORDER = "#e5e5ea";
const SALE = "#e30000";
const ADDRESS = "Белгород, ул. Попова, 36 (Универмаг Белгород, 1 этаж)";
const PHONE = "+7 (904) 098-88-77";

type Cat = "transactional" | "marketing" | "trigger";
type Tpl = {
  slug: string; name: string; category: Cat;
  subject: string; preview_text: string;
  body: string; // HTML контента (между шапкой и подвалом), с {{переменными}}
  variables: string[];
};

const btn = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 6px;"><tr><td style="border-radius:980px;background:${INK};">
<a href="${href}" style="display:inline-block;padding:14px 30px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:980px;">${label}</a></td></tr></table>`;

const p = (html: string) => `<p style="margin:0 0 15px;font-size:15px;line-height:1.6;color:${INK};">${html}</p>`;
const h = (html: string) => `<h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${INK};">${html}</h1>`;
const small = (html: string) => `<p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED};">${html}</p>`;

/** Общая обёртка письма. transactional — без ссылки отписки (152-ФЗ). */
function layout(t: Tpl): string {
  const unsub =
    t.category === "transactional"
      ? ""
      : `<p style="margin:8px 0 0;font-size:12px;color:${MUTED};">Не хотите получать такие письма? <a href="{{unsubscribe_url}}" style="color:${MUTED};text-decoration:underline;">Отписаться</a></p>`;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.preview_text}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
<tr><td style="padding:22px 30px;border-bottom:1px solid ${BORDER};">
<span style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:${INK};">PhoneTrade</span>
<span style="font-size:12px;color:${MUTED};"> · Apple в Белгороде</span></td></tr>
<tr><td style="padding:0;background:#f5f5f7;text-align:center;border-bottom:1px solid ${BORDER};">
<img src="${HEADER_BASE}${headerKey(t.slug)}.png" alt="" width="300" style="display:inline-block;width:300px;max-width:100%;height:auto;border:0;"></td></tr>
<tr><td style="padding:30px;">${t.body}</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;line-height:1.6;">
${ADDRESS}<br>${PHONE} · <a href="${SITE}" style="color:${INK};text-decoration:none;">phonetrade31.ru</a>
${unsub}</td></tr>
</table></td></tr></table></body></html>`;
}

// ── 14 шаблонов ────────────────────────────────────────────────────────────
const TEMPLATES: Tpl[] = [
  // 1. Welcome 1 — приветствие
  {
    slug: "welcome_1", name: "Welcome 1 — приветствие", category: "trigger",
    subject: "Добро пожаловать в PhoneTrade 👋",
    preview_text: "Оригинальная техника Apple в Белгороде — с гарантией и сервисом.",
    variables: ["customer.first_name", "unsubscribe_url"],
    body: h("Здравствуйте, {{customer.first_name}}!") +
      p("Спасибо, что вы с <b>PhoneTrade</b> — магазином оригинальной техники Apple в Белгороде.") +
      p("У нас только оригинал с проверкой по серийному номеру, собственный сервис, Trade-in и рассрочка. Нужен совет по выбору — просто ответьте на это письмо или позвоните.") +
      btn(`${SITE}/catalog`, "Смотреть каталог") +
      small("Впереди — пара писем с пользой: как выбрать модель и как выгодно обменять старое устройство."),
  },
  // 2. Welcome 2 — помощь в выборе (+2 дня)
  {
    slug: "welcome_2", name: "Welcome 2 — помощь в выборе", category: "trigger",
    subject: "Какой iPhone выбрать? Короткий гид",
    preview_text: "17, Air, Pro или Pro Max — за минуту разберёмся, что вам подойдёт.",
    variables: ["customer.first_name", "unsubscribe_url"],
    body: h("Подобрать iPhone за минуту") +
      p("{{customer.first_name}}, чтобы не теряться в линейке, вот короткий ориентир:") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;font-size:14px;line-height:1.6;color:${INK};">
<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};"><b>iPhone 17</b> — для большинства: быстрый, отличная камера, разумная цена.</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};"><b>iPhone Air</b> — самый тонкий и лёгкий, для ценителей дизайна.</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};"><b>Pro / Pro Max</b> — максимум камеры, экрана и автономности.</td></tr></table>` +
      p("Не уверены — напишите нам модель, которой пользуетесь сейчас, подскажем апгрейд под ваши задачи и бюджет.") +
      btn(`${SITE}/category/iphone`, "Выбрать iPhone"),
  },
  // 3. Welcome 3 — Trade-in (+5 дней)
  {
    slug: "welcome_3", name: "Welcome 3 — Trade-in", category: "trigger",
    subject: "Сдайте старое устройство — получите скидку",
    preview_text: "Trade-in: оценим за 15 минут и вычтем из цены нового Apple.",
    variables: ["customer.first_name", "unsubscribe_url"],
    body: h("Обменяйте старое на новое") +
      p("{{customer.first_name}}, ваш прежний смартфон может стать частью оплаты нового. Принимаем iPhone, iPad, Mac, Watch и AirPods.") +
      p("Оценка за 15 минут, сумма сразу вычитается из стоимости покупки — без ожидания и скрытых условий.") +
      btn(`${SITE}/trade-in`, "Узнать сумму обмена"),
  },
  // 4. Подтверждение заказа (транзакционное)
  {
    slug: "order_confirmation", name: "Подтверждение заказа", category: "transactional",
    subject: "Заказ {{order.number}} принят — PhoneTrade",
    preview_text: "Мы получили ваш заказ. Менеджер скоро свяжется для подтверждения.",
    variables: ["customer.first_name", "order.number", "order.items", "order.total", "order.payment", "order.delivery"],
    body: h("Заказ {{order.number}} принят") +
      p("Здравствуйте, {{customer.first_name}}! Спасибо за заказ — менеджер свяжется с вами для подтверждения.") +
      `<div style="margin:6px 0 14px;">{{order.items}}</div>` +
      p(`<b>Итого: {{order.total}}</b>`) +
      small("Оплата: {{order.payment}} · Получение: {{order.delivery}}") +
      btn(`${SITE}/account/orders`, "Мои заказы"),
  },
  // 5. Заказ отправлен / готов (транзакционное)
  {
    slug: "order_shipped", name: "Заказ отправлен / готов", category: "transactional",
    subject: "Заказ {{order.number}}: {{order.status}}",
    preview_text: "Хорошие новости по вашему заказу — детали внутри.",
    variables: ["customer.first_name", "order.number", "order.status", "order.tracking_number", "order.tracking_url"],
    body: h("Ваш заказ {{order.status}}") +
      p("{{customer.first_name}}, статус заказа <b>{{order.number}}</b> обновлён: <b>{{order.status}}</b>.") +
      p("Трек-номер: {{order.tracking_number}}") +
      btn("{{order.tracking_url}}", "Отследить заказ"),
  },
  // 6. Брошенная корзина — шаг 1
  {
    slug: "abandoned_cart_1", name: "Брошенная корзина 1 — напоминание", category: "trigger",
    subject: "Вы кое-что забыли в корзине",
    preview_text: "Ваши товары ещё на месте — вернитесь и завершите заказ.",
    variables: ["customer.first_name", "cart.items", "cart.total", "cart.url", "unsubscribe_url"],
    body: h("Ваша корзина ждёт") +
      p("{{customer.first_name}}, вы не завершили оформление. Мы сохранили выбранное:") +
      `<div style="margin:6px 0 14px;">{{cart.items}}</div>` +
      p(`<b>Сумма: {{cart.total}}</b>`) +
      btn("{{cart.url}}", "Вернуться к корзине"),
  },
  // 7. Брошенная корзина — шаг 2
  {
    slug: "abandoned_cart_2", name: "Брошенная корзина 2 — подборка", category: "trigger",
    subject: "Эти товары всё ещё доступны",
    preview_text: "Напоминаем о вашем выборе — и пара похожих вариантов.",
    variables: ["customer.first_name", "cart.items", "cart.url", "unsubscribe_url"],
    body: h("Не упустите свой выбор") +
      p("{{customer.first_name}}, товары из вашей корзины пока в наличии. Если остались вопросы по характеристикам или оплате — ответьте на это письмо, поможем определиться.") +
      `<div style="margin:6px 0 14px;">{{cart.items}}</div>` +
      btn("{{cart.url}}", "Оформить заказ"),
  },
  // 8. Брошенная корзина — шаг 3 (промокод)
  {
    slug: "abandoned_cart_3", name: "Брошенная корзина 3 — промокод", category: "trigger",
    subject: "Промокод на 1000 ₽ — последний шанс",
    preview_text: "Дарим 1000 ₽ на ваш заказ. Промокод внутри, успейте применить.",
    variables: ["customer.first_name", "promo.code", "cart.url", "unsubscribe_url"],
    body: h("Небольшой бонус, чтобы решиться") +
      p("{{customer.first_name}}, дарим <b>1000 ₽</b> на заказ из вашей корзины.") +
      `<div style="margin:12px 0;padding:16px;border:1px dashed ${INK};border-radius:12px;text-align:center;">
<span style="font-size:13px;color:${MUTED};">Промокод</span><br><span style="font-size:22px;font-weight:700;letter-spacing:0.06em;color:${SALE};">{{promo.code}}</span></div>` +
      btn("{{cart.url}}", "Применить и оформить"),
  },
  // 9. Запрос отзыва (+7 дней)
  {
    slug: "review_request", name: "Запрос отзыва", category: "trigger",
    subject: "Как вам покупка, {{customer.first_name}}?",
    preview_text: "Пара слов от вас помогут другим — и нам стать лучше.",
    variables: ["customer.first_name", "unsubscribe_url"],
    body: h("Поделитесь впечатлением") +
      p("{{customer.first_name}}, надеемся, новое устройство радует. Если всё понравилось — короткий отзыв очень поможет другим покупателям и нам.") +
      btn("https://yandex.ru/maps/org/68859755553", "Оставить отзыв на Яндекс.Картах") +
      small("Что-то пошло не так? Просто ответьте на это письмо — разберёмся."),
  },
  // 10. Cross-sell к iPhone (+5 дней)
  {
    slug: "cross_sell_iphone", name: "Cross-sell к iPhone", category: "trigger",
    subject: "Защитите новый iPhone",
    preview_text: "Чехлы, защитные стёкла и зарядки — подобрали под вашу модель.",
    variables: ["customer.first_name", "unsubscribe_url"],
    body: h("Аксессуары для вашего iPhone") +
      p("{{customer.first_name}}, чтобы новый iPhone дольше оставался как новый — стоит добавить чехол, защитное стекло и быструю зарядку.") +
      btn(`${SITE}/category/accessories`, "Смотреть аксессуары"),
  },
  // 11. День рождения (шаблон готов; триггер отложен)
  {
    slug: "birthday", name: "День рождения", category: "trigger",
    subject: "С днём рождения, {{customer.first_name}}! 🎁",
    preview_text: "Подарок от PhoneTrade — промокод на вашу следующую покупку.",
    variables: ["customer.first_name", "promo.code", "unsubscribe_url"],
    body: h("С днём рождения!") +
      p("{{customer.first_name}}, команда PhoneTrade поздравляет вас! Держите подарок — промокод на скидку:") +
      `<div style="margin:12px 0;padding:16px;border:1px dashed ${INK};border-radius:12px;text-align:center;">
<span style="font-size:22px;font-weight:700;letter-spacing:0.06em;color:${SALE};">{{promo.code}}</span></div>` +
      btn(`${SITE}/catalog`, "Выбрать подарок себе"),
  },
  // 12. Кампания — промо
  {
    slug: "campaign_promo", name: "Кампания — промо", category: "marketing",
    subject: "{{campaign.subject}}",
    preview_text: "{{campaign.preview}}",
    variables: ["campaign.subject", "campaign.preview", "campaign.hero_image", "campaign.title", "campaign.body", "campaign.cta_text", "campaign.cta_url", "unsubscribe_url"],
    body: `<img src="{{campaign.hero_image}}" alt="" width="500" style="display:block;width:100%;max-width:500px;border-radius:12px;margin:0 auto 18px;">` +
      h("{{campaign.title}}") +
      p("{{campaign.body}}") +
      btn("{{campaign.cta_url}}", "{{campaign.cta_text}}"),
  },
  // 13. Кампания — новости/новинки
  {
    slug: "campaign_newsletter", name: "Кампания — новости и новинки", category: "marketing",
    subject: "{{campaign.subject}}",
    preview_text: "{{campaign.preview}}",
    variables: ["campaign.subject", "campaign.preview", "campaign.title", "campaign.body", "campaign.cta_text", "campaign.cta_url", "unsubscribe_url"],
    body: small("Новости PhoneTrade") +
      h("{{campaign.title}}") +
      p("{{campaign.body}}") +
      btn("{{campaign.cta_url}}", "{{campaign.cta_text}}"),
  },
  // 14. Кампания — минималистичная
  {
    slug: "campaign_minimal", name: "Кампания — минималистичная", category: "marketing",
    subject: "{{campaign.subject}}",
    preview_text: "{{campaign.preview}}",
    variables: ["campaign.subject", "campaign.preview", "campaign.body", "campaign.cta_text", "campaign.cta_url", "unsubscribe_url"],
    body: p("{{campaign.body}}") + btn("{{campaign.cta_url}}", "{{campaign.cta_text}}"),
  },
];

// Текстовая версия — из HTML грубым стрипом тегов.
const toText = (html: string) =>
  html.replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|h1|tr|div)>/g, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();

// Демо-данные для превью.
const SAMPLE: Record<string, unknown> = {
  customer: { first_name: "Денис", name: "Денис Астахов" },
  order: { number: "PT-2026-0042", total: "96 000 ₽", payment: "Картой", delivery: "Самовывоз (ул. Попова, 36)", status: "В пути", tracking_number: "CDEK-1234567", tracking_url: SITE, items: '<div style="padding:8px 0;border-bottom:1px solid #e5e5ea;font-size:14px;">iPhone 17 256GB Black × 1 — 72 000 ₽</div>' },
  cart: { total: "72 000 ₽", url: `${SITE}/cart`, items: '<div style="padding:8px 0;border-bottom:1px solid #e5e5ea;font-size:14px;">iPhone 17 256GB Black × 1 — 72 000 ₽</div>' },
  promo: { code: "CART1000" },
  campaign: { subject: "iPhone 17 в наличии", preview: "Только привезли", hero_image: `${SITE}/opengraph-image`, title: "iPhone 17 Pro Max в новом цвете", body: "Cosmic Orange уже на витрине. Успейте — первые партии разбирают быстро.", cta_text: "Смотреть", cta_url: `${SITE}/category/iphone` },
  unsubscribe_url: `${SITE}/unsubscribe?token=demo`,
};

function render(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), vars);
    return v == null ? "" : String(v);
  });
}

function buildPreview() {
  const cards = TEMPLATES.map((t) => {
    const full = render(layout(t), SAMPLE);
    return `<section style="margin:0 0 40px;">
<div style="font:600 14px -apple-system,sans-serif;color:#1d1d1f;margin-bottom:4px;">${t.name} · <span style="color:#6e6e73;font-weight:400;">${t.slug} · ${t.category}</span></div>
<div style="font:13px -apple-system,sans-serif;color:#6e6e73;margin-bottom:10px;">Тема: «${render(t.subject, SAMPLE)}» — превью: «${render(t.preview_text, SAMPLE)}»</div>
<iframe srcdoc="${full.replace(/"/g, "&quot;")}" style="width:600px;max-width:100%;height:560px;border:1px solid #e5e5ea;border-radius:12px;background:#f5f5f7;"></iframe>
</section>`;
  }).join("\n");
  const page = `<!doctype html><html><head><meta charset="utf-8"><title>PhoneTrade — превью писем</title></head>
<body style="margin:0;padding:32px;background:#fff;"><h1 style="font:700 24px -apple-system,sans-serif;color:#1d1d1f;">Шаблоны писем PhoneTrade (14)</h1>${cards}</body></html>`;
  writeFileSync("/tmp/email-templates-preview.html", page, "utf8");
  console.log("Превью: /tmp/email-templates-preview.html");
}

async function seed() {
  const raw = readFileSync(".env.local", "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  for (const t of TEMPLATES) {
    const html = layout(t);
    const { error } = await db.from("email_templates").upsert({
      slug: t.slug, name: t.name, category: t.category, subject: t.subject,
      preview_text: t.preview_text, html_content: html, text_content: toText(t.body),
      variables: t.variables, is_system: true, is_active: true,
      thumbnail_url: `${HEADER_BASE}${headerKey(t.slug)}.png`, updated_at: new Date().toISOString(),
    }, { onConflict: "slug" });
    console.log(error ? `✗ ${t.slug}: ${error.message}` : `✓ ${t.slug}`);
  }
}

if (process.argv.includes("--preview")) buildPreview();
else seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
