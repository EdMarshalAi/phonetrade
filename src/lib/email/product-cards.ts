/**
 * Карточки товаров для писем (email-safe, table-based, стиль сайта): фото на
 * белом, название, цена за наличные (красным), цена картой, ссылка. Реальные
 * фото из каталога (Storage). Пустой модуль без server-зависимостей —
 * импортируется и на клиенте (превью).
 */
export type EmailProduct = { image: string; title: string; priceCash?: number | null; priceCard?: number | null; url: string };
export type EmailItem = { image?: string | null; title: string; qty: number; price: number };

const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const BORDER = "#e5e5ea";
const SALE = "#e30000";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const PLACEHOLDER = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/email/headers/campaign.png";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const url = (u: string) => (u.startsWith("/") ? SITE + u : u);

function cardCell(c: EmailProduct): string {
  return `<td width="50%" valign="top" style="padding:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:14px;overflow:hidden;background:#fff;">
<tr><td style="background:#fff;text-align:center;padding:14px 10px 6px;"><a href="${url(c.url)}"><img src="${c.image}" alt="${esc(c.title)}" width="150" style="display:inline-block;width:150px;max-width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:2px 14px 14px;">
<a href="${url(c.url)}" style="display:block;font-size:13px;font-weight:600;color:${INK};text-decoration:none;line-height:1.3;min-height:34px;">${esc(c.title)}</a>
${c.priceCash ? `<div style="margin-top:6px;font-size:16px;font-weight:700;color:${SALE};">${rub(c.priceCash)}</div>` : ""}
${c.priceCard ? `<div style="font-size:12px;color:${MUTED};">${rub(c.priceCard)} картой</div>` : ""}
</td></tr></table></td>`;
}

/** Сетка карточек товаров (по 2 в ряд). */
export function renderProductCards(products: EmailProduct[]): string {
  if (!products.length) return "";
  let cells = "";
  products.forEach((p, i) => {
    cells += cardCell(p);
    if (i % 2 === 1 && i < products.length - 1) cells += `</tr><tr>`;
  });
  if (products.length % 2 === 1) cells += `<td width="50%"></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 2px;"><tr>${cells}</tr></table>`;
}

/** Строки состава заказа/корзины с миниатюрой товара. */
export function renderItemRows(items: EmailItem[]): string {
  return items.map((it) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${BORDER};"><tr>
<td width="60" valign="middle" style="padding:8px 12px 8px 0;"><img src="${it.image || PLACEHOLDER}" alt="" width="52" style="display:block;width:52px;height:52px;object-fit:contain;border:1px solid ${BORDER};border-radius:8px;background:#fff;"></td>
<td valign="middle" style="font-size:14px;color:${INK};line-height:1.3;">${esc(it.title)} <span style="color:${MUTED};">× ${it.qty}</span></td>
<td valign="middle" align="right" style="font-size:14px;font-weight:600;color:${INK};white-space:nowrap;">${rub(it.price * it.qty)}</td>
</tr></table>`).join("");
}
