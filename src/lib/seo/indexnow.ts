/**
 * IndexNow — мгновенное уведомление поисковиков (Яндекс, Bing) об изменённых URL.
 * Ключ публичный (лежит в public/<key>.txt). Вызывается из adminMutation после
 * успешной записи — при смене цен, наличия, статуса, контента поисковик сразу
 * переобходит страницу. Best-effort: ошибки не роняют мутацию.
 * Спека: https://www.indexnow.org/documentation
 */

export const INDEXNOW_KEY = "f7eec1c6f979d67e7220e5c92a5dd759";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");

// Не шлём в IndexNow приватные/сервисные разделы (совпадает с disallow в robots).
const PRIVATE = /^\/(admin|account|cart|auth|api|search)(\/|$)/;

/** Уведомляет IndexNow об изменённых публичных путях. Fire-and-forget. */
export async function pingIndexNow(paths: string[]): Promise<void> {
  try {
    const urlList = Array.from(
      new Set(
        (paths ?? [])
          .filter((p) => typeof p === "string" && p.startsWith("/") && !PRIVATE.test(p))
          .map((p) => `${SITE_URL}${p === "/" ? "" : p}`)
      )
    );
    if (urlList.length === 0) return;
    const host = new URL(SITE_URL).host;
    const body = JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList });
    // Шлём напрямую в Яндекс (приоритет) и Bing — агрегатор api.indexnow.org капризен к ключу.
    await Promise.allSettled(
      ["https://yandex.com/indexnow", "https://www.bing.com/indexnow"].map((endpoint) =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body,
          signal: AbortSignal.timeout(5000),
        })
      )
    );
  } catch {
    /* IndexNow — вспомогательный сигнал, молча игнорируем сбои */
  }
}
