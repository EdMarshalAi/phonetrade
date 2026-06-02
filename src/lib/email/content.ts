/**
 * Слой редактируемого контента писем. Шаблон в БД содержит плейсхолдеры
 * {{c.heading}}, {{c.body}}, {{c.cta_text}}, {{c.cta_url}}, {{c.header_image}} —
 * их заполняет менеджер (поля в админке), БЕЗ правки HTML. Динамические данные
 * ({{customer.*}}, {{order.*}} и т.п.) подставляются позже рендером (render.ts).
 *
 * Порядок: applyContent(html, content) → renderTemplate(html2, runtimeVars).
 * Чистый модуль (без server-зависимостей) — можно импортировать и на клиенте.
 */
export type TemplateContent = {
  heading?: string;
  body?: string;
  cta_text?: string;
  cta_url?: string;
  header_image?: string;
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const INK = "#1d1d1f";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Текст body (с переводами строк) → абзацы письма. */
function paragraphs(body: string): string {
  return body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 15px;font-size:15px;line-height:1.6;color:${INK};">${esc(l)}</p>`)
    .join("");
}

function resolveUrl(u: string): string {
  if (!u) return SITE;
  return u.startsWith("/") ? SITE + u : u;
}

/** Подставляет редактируемые поля контента в HTML шаблона. */
export function applyContent(html: string, c: TemplateContent = {}): string {
  return html
    .replace(/\{\{\s*c\.heading\s*\}\}/g, esc(c.heading ?? ""))
    .replace(/\{\{\s*c\.body\s*\}\}/g, paragraphs(c.body ?? ""))
    .replace(/\{\{\s*c\.cta_text\s*\}\}/g, esc(c.cta_text ?? ""))
    .replace(/\{\{\s*c\.cta_url\s*\}\}/g, resolveUrl(c.cta_url ?? ""))
    .replace(/\{\{\s*c\.header_image\s*\}\}/g, c.header_image ?? "");
}
