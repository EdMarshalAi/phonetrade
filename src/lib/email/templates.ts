/**
 * HTML-шаблоны писем покупателю. Inline-CSS (почтовые клиенты не грузят <style>),
 * палитра PhoneTrade (ink/белый), русский. Каждый билдер возвращает
 * { subject, html, text } — text как фолбэк для клиентов без HTML.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const BORDER = "#e5e5ea";
const ADDRESS = "Белгород, ул. Попова, 36 (Универмаг Белгород, 1 этаж)";
const PHONE = "+7 (904) 098-88-77";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

/** Общая обёртка письма: шапка-логотип, контент, подвал с контактами. */
function layout(preheader: string, contentHtml: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;">
<tr><td style="padding:22px 28px;border-bottom:1px solid ${BORDER};">
<span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${INK};">PhoneTrade</span>
<span style="font-size:12px;color:${MUTED};"> · Apple в Белгороде</span>
</td></tr>
<tr><td style="padding:28px;color:${INK};font-size:15px;line-height:1.55;">${contentHtml}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;line-height:1.6;">
${esc(ADDRESS)}<br>${esc(PHONE)} · <a href="${SITE_URL}" style="color:${INK};text-decoration:none;">phonetrade31.ru</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:10px;background:${INK};">
<a href="${href}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${esc(label)}</a>
</td></tr></table>`;
}

export type EmailContent = { subject: string; html: string; text: string };

/** Приветствие при регистрации. */
export function welcomeEmail(name: string): EmailContent {
  const hi = name.trim() ? `, ${esc(name.trim())}` : "";
  const subject = "Добро пожаловать в PhoneTrade";
  const html = layout(
    "Спасибо за регистрацию в PhoneTrade",
    `<p style="margin:0 0 14px;">Здравствуйте${hi}!</p>
<p style="margin:0 0 14px;">Спасибо, что зарегистрировались в <b>PhoneTrade</b> — магазине оригинальной техники Apple в Белгороде. В личном кабинете доступны история заказов и статусы.</p>
<p style="margin:0 0 14px;">Оригинал, гарантия, Trade-in и собственный сервис. Если нужна помощь с выбором — пишите или звоните, подскажем.</p>
${button(`${SITE_URL}/account`, "Открыть личный кабинет")}
<p style="margin:0;color:${MUTED};font-size:13px;">Если регистрировались не вы — просто проигнорируйте это письмо.</p>`
  );
  const text = `Здравствуйте${name.trim() ? ", " + name.trim() : ""}!\n\nСпасибо за регистрацию в PhoneTrade — Apple в Белгороде. Личный кабинет: ${SITE_URL}/account\n\n${ADDRESS}\n${PHONE}`;
  return { subject, html, text };
}

export type OrderEmailItem = { title: string; qty: number; price: number };

/** Подтверждение заказа. */
export function orderConfirmationEmail(o: {
  name: string;
  orderNumber: string;
  items: OrderEmailItem[];
  total: number;
  paymentLabel: string;
  deliveryLabel: string;
  address?: string;
}): EmailContent {
  const hi = o.name.trim() ? `, ${esc(o.name.trim())}` : "";
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};">${esc(i.title)} <span style="color:${MUTED};">× ${i.qty}</span></td>
<td align="right" style="padding:8px 0;border-bottom:1px solid ${BORDER};white-space:nowrap;">${rub(i.price * i.qty)}</td></tr>`
    )
    .join("");
  const subject = `Заказ ${o.orderNumber} принят — PhoneTrade`;
  const html = layout(
    `Ваш заказ ${o.orderNumber} принят`,
    `<p style="margin:0 0 14px;">Здравствуйте${hi}!</p>
<p style="margin:0 0 14px;">Ваш заказ <b>${esc(o.orderNumber)}</b> принят. Менеджер свяжется с вами для подтверждения.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 14px;font-size:14px;">${rows}
<tr><td style="padding:12px 0 0;font-weight:700;">Итого</td><td align="right" style="padding:12px 0 0;font-weight:700;">${rub(o.total)}</td></tr></table>
<p style="margin:0 0 6px;color:${MUTED};font-size:14px;">Оплата: ${esc(o.paymentLabel)}</p>
<p style="margin:0 0 14px;color:${MUTED};font-size:14px;">Доставка: ${esc(o.deliveryLabel)}${o.address ? " · " + esc(o.address) : ""}</p>
${button(`${SITE_URL}/account/orders`, "Мои заказы")}`
  );
  const text =
    `Здравствуйте${o.name.trim() ? ", " + o.name.trim() : ""}!\n\nЗаказ ${o.orderNumber} принят.\n\n` +
    o.items.map((i) => `• ${i.title} × ${i.qty} — ${rub(i.price * i.qty)}`).join("\n") +
    `\n\nИтого: ${rub(o.total)}\nОплата: ${o.paymentLabel}\nДоставка: ${o.deliveryLabel}${o.address ? " · " + o.address : ""}\n\nМои заказы: ${SITE_URL}/account/orders\n\n${ADDRESS}\n${PHONE}`;
  return { subject, html, text };
}

/** Смена статуса заказа. */
export function orderStatusEmail(o: {
  name: string;
  orderNumber: string;
  statusLabel: string;
  statusColor?: string;
}): EmailContent {
  const hi = o.name.trim() ? `, ${esc(o.name.trim())}` : "";
  const color = o.statusColor && /^#[0-9a-fA-F]{3,8}$/.test(o.statusColor) ? o.statusColor : INK;
  const subject = `Заказ ${o.orderNumber}: ${o.statusLabel} — PhoneTrade`;
  const html = layout(
    `Статус заказа ${o.orderNumber}: ${o.statusLabel}`,
    `<p style="margin:0 0 14px;">Здравствуйте${hi}!</p>
<p style="margin:0 0 14px;">Статус вашего заказа <b>${esc(o.orderNumber)}</b> обновлён:</p>
<p style="margin:0 0 18px;"><span style="display:inline-block;padding:7px 14px;border-radius:999px;background:${color}1a;color:${color};font-weight:600;font-size:14px;">${esc(o.statusLabel)}</span></p>
${button(`${SITE_URL}/account/orders`, "Посмотреть заказ")}`
  );
  const text = `Здравствуйте${o.name.trim() ? ", " + o.name.trim() : ""}!\n\nЗаказ ${o.orderNumber}: ${o.statusLabel}\n\nМои заказы: ${SITE_URL}/account/orders\n\n${ADDRESS}\n${PHONE}`;
  return { subject, html, text };
}

/** Письмо со ссылкой сброса пароля. */
export function passwordResetEmail(o: { name?: string; link: string; isAdmin?: boolean }): EmailContent {
  const hi = o.name?.trim() ? `, ${esc(o.name.trim())}` : "";
  const where = o.isAdmin ? "в админ-панель PhoneTrade" : "в личный кабинет PhoneTrade";
  const subject = "Восстановление пароля — PhoneTrade";
  const html = layout(
    "Ссылка для восстановления пароля",
    `<p style="margin:0 0 14px;">Здравствуйте${hi}!</p>
<p style="margin:0 0 14px;">Вы запросили восстановление пароля для входа ${where}. Нажмите кнопку, чтобы задать новый пароль. Ссылка действует <b>1 час</b>.</p>
${button(o.link, "Задать новый пароль")}
<p style="margin:0 0 8px;color:${MUTED};font-size:13px;">Если кнопка не работает, скопируйте ссылку:</p>
<p style="margin:0 0 14px;font-size:13px;word-break:break-all;"><a href="${o.link}" style="color:${INK};">${esc(o.link)}</a></p>
<p style="margin:0;color:${MUTED};font-size:13px;">Если вы не запрашивали сброс — просто проигнорируйте письмо, пароль останется прежним.</p>`
  );
  const text = `Здравствуйте${o.name?.trim() ? ", " + o.name.trim() : ""}!\n\nВосстановление пароля ${where}. Ссылка (действует 1 час):\n${o.link}\n\nЕсли вы не запрашивали — проигнорируйте письмо.`;
  return { subject, html, text };
}
