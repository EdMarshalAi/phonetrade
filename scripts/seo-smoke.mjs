/**
 * SEO drift-гейт для CI: после деплоя проверяет эталонные URL на критичные
 * регрессии (4xx/5xx, пропавший <title>/canonical, случайный noindex).
 * Падает (exit 1) на CRITICAL — страховка от повторения массовой просадки.
 * Запуск: node scripts/seo-smoke.mjs  (BASE переопределяется env SMOKE_BASE)
 */
const BASE = process.env.SMOKE_BASE || "https://phonetrade31.ru";
// Только нередиректные, стабильные эталоны (редиректные посты сюда не кладём).
const URLS = [
  "/",
  "/category/iphone",
  "/repair",
  "/blog/naushniki-apple-airpods-belgorod",
  "/kupit-apple-staryj-oskol",
  "/remont-apple-staryj-oskol",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Запрос с ретраями на 5xx — гасим транзиентные 502 при холодном ISR после деплоя. */
async function fetchWithRetry(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "PhoneTrade-SEO-Smoke/1.0" } });
    if (res.status < 500) return res;
    last = res;
    await sleep(2500);
  }
  return last;
}

let failed = 0;
for (const path of URLS) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetchWithRetry(url);
    const problems = [];
    if (res.status !== 200) problems.push(`HTTP ${res.status}`);
    const html = await res.text();
    if (!/<title>[^<]{3,}<\/title>/i.test(html)) problems.push("нет <title>");
    if (!/rel=["']canonical["']/i.test(html)) problems.push("нет canonical");
    if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) problems.push("noindex!");
    if (problems.length) {
      console.error(`✗ ${path} — ${problems.join(", ")}`);
      failed++;
    } else {
      console.log(`✓ ${path}`);
    }
  } catch (e) {
    console.error(`✗ ${path} — ошибка запроса: ${e.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\nDRIFT-ГЕЙТ: ${failed} критичных проблем — проверьте деплой.`);
  process.exit(1);
}
console.log(`\nDRIFT-ГЕЙТ: все ${URLS.length} эталонных URL в порядке.`);
