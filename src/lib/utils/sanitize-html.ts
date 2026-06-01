import sanitizeHtml from "sanitize-html";

/**
 * Санитайзер для админского HTML, который выводится через dangerouslySetInnerHTML
 * (описания товаров, блог, статические страницы, инфо-блоки). Удаляет
 * скрипты, iframe, обработчики событий и javascript-ссылки, оставляя обычное
 * форматирование (заголовки, списки, ссылки, картинки, таблицы, классы/стили).
 * Defense-in-depth: источник админский (RLS), но санитайз убирает stored-XSS.
 * ВАЖНО: серверная утилита (Node) — не импортировать в клиентские компоненты;
 * для клиентских веток (CatalogShell) санитайзить HTML на сервере до передачи.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img", "h1", "h2", "figure", "figcaption", "span", "u", "s", "section", "details", "summary",
  ]),
  allowedAttributes: {
    "*": ["class", "style", "id"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  // дополнительно: запрет потенциально опасных CSS (url/expression) — на всякий случай
  allowedStyles: {
    "*": {
      "color": [/^.*$/], "background-color": [/^.*$/], "text-align": [/^.*$/],
      "font-weight": [/^.*$/], "font-style": [/^.*$/], "font-size": [/^.*$/],
      "width": [/^.*$/], "height": [/^.*$/], "margin": [/^.*$/], "padding": [/^.*$/],
    },
  },
};

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}
