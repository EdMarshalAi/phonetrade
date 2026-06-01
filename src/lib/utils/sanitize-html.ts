import sanitizeHtml from "sanitize-html";

/**
 * Санитайзер для админского HTML, который выводится через dangerouslySetInnerHTML
 * (описания товаров, блог, статические страницы, инфо-блоки). Удаляет
 * скрипты, iframe, обработчики событий и javascript-ссылки, оставляя обычное
 * форматирование и ВЁРСТКУ страниц (инлайн-CSS, <style>-блоки, svg-иконки).
 * Источник админский (RLS) — санитайз это defense-in-depth от stored-XSS.
 * ВАЖНО: серверная утилита (Node) — не импортировать в клиентские компоненты;
 * для клиентских веток (CatalogShell) санитайзить HTML на сервере до передачи.
 *
 * Дизайн-страницы (/about, /payment и пр.) свёрстаны инлайн-CSS, грид/флексом и
 * <style>-блоками — поэтому НЕ ограничиваем набор CSS-свойств и сохраняем <style>.
 * Реальная защита от XSS — запрет <script>/<iframe>, обработчиков on* и
 * javascript:-схем (ниже) — остаётся в силе.
 */
const SVG_TAGS = ["svg", "path", "g", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "use", "title"];
const SVG_ATTRS = [
  "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "points", "transform", "xmlns",
  "fill-rule", "clip-rule", "opacity", "offset", "stop-color", "stop-opacity", "gradientUnits",
  "gradientTransform", "aria-hidden", "focusable", "preserveAspectRatio",
];

const OPTIONS: sanitizeHtml.IOptions = {
  // Сохраняем регистр атрибутов — иначе SVG ломается (viewBox → viewbox и т.п.).
  parser: { lowerCaseAttributeNames: false },
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img", "h1", "h2", "figure", "figcaption", "span", "u", "s", "section", "details", "summary", "style",
    ...SVG_TAGS,
  ]),
  allowedAttributes: {
    "*": ["class", "style", "id", ...SVG_ATTRS],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  // <style> сохраняем вместе с содержимым (страницы свёрстаны CSS-блоками);
  // <script>/<textarea>/<noscript> по-прежнему вырезаются вместе с контентом.
  nonTextTags: ["script", "textarea", "option", "noscript"],
  // allowedStyles НЕ задаём — разрешаем любые CSS-свойства в инлайн-стилях.
};

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}
