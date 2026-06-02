/**
 * Рендер шаблонов писем: подстановка переменных {{path.to.value}} и добавление
 * UTM-меток к ссылкам на наш сайт (для аналитики в Я.Метрике). Click-tracking
 * (обёртка ссылок в redirect) — отдельная фаза.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
    obj
  );
}

/** Подставляет {{переменные}} из vars. Отсутствующие → пустая строка. */
export function renderTemplate(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const v = resolvePath(vars, path);
    return v == null ? "" : String(v);
  });
}

/** Добавляет UTM к ссылкам, ведущим на наш сайт (абсолютным и относительным). */
export function addUtm(html: string, campaign: string): string {
  return html.replace(/href="([^"]+)"/g, (m, url: string) => {
    if (url.startsWith("mailto:") || url.startsWith("#") || url.startsWith("tel:")) return m;
    const isOurs = url.startsWith("/") || url.startsWith(SITE);
    if (!isOurs || /[?&]utm_/.test(url)) return m;
    const abs = url.startsWith("/") ? SITE + url : url;
    const sep = abs.includes("?") ? "&" : "?";
    return `href="${abs}${sep}utm_source=email&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}"`;
  });
}
