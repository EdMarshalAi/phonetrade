/**
 * SEO drift-гейт для CI: после деплоя проверяет эталонные URL на критичные
 * регрессии (4xx/5xx, пропавший <title>/canonical, случайный noindex).
 * Падает (exit 1) на CRITICAL — страховка от повторения массовой просадки.
 * Запуск: node scripts/seo-smoke.mjs  (BASE переопределяется env SMOKE_BASE)
 */
const BASE = (process.env.SMOKE_BASE || "https://phonetrade31.ru").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;
const CANONICAL_ORIGIN = new URL(
  process.env.SMOKE_CANONICAL_ORIGIN || "https://phonetrade31.ru"
).origin;

function sitemapFloor(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

const MIN_SITEMAP_PRODUCTS = sitemapFloor("SMOKE_MIN_PRODUCTS", 200);
const MIN_SITEMAP_CATEGORIES = sitemapFloor("SMOKE_MIN_CATEGORIES", 20);
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
async function fetchWithRetry(url, tries = 3, headers = {}) {
  let lastResponse;
  let lastError;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "PhoneTrade-SEO-Smoke/1.0", ...headers },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.status < 500) return res;
      lastResponse = res;
    } catch (error) {
      lastError = error;
    }
    if (i + 1 < tries) await sleep(2500);
  }
  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("запрос не выполнен");
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? "";
}

function canonicalUrl(html) {
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((candidate) => attribute(candidate, "rel").toLowerCase().split(/\s+/).includes("canonical"));
  const href = tag ? attribute(tag, "href") : "";
  return href ? new URL(href, BASE) : null;
}

function canonicalProblem(html, expectedPath) {
  const canonical = canonicalUrl(html);
  if (!canonical) return "нет canonical";
  const path = canonical.pathname.replace(/\/$/, "") || "/";
  if (canonical.origin !== CANONICAL_ORIGIN) return `canonical origin=${canonical.origin}`;
  if (canonical.search || canonical.hash) return `canonical содержит query/hash: ${canonical.search}${canonical.hash}`;
  if (path !== expectedPath) return `canonical=${path}`;
  return "";
}

function metaContent(html, name) {
  const tag = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((candidate) => attribute(candidate, "name").toLowerCase() === name.toLowerCase());
  return tag ? attribute(tag, "content") : "";
}

function hasNoindex(html, headers) {
  if (/\bnoindex\b/i.test(headers.get("x-robots-tag") || "")) return true;
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => match[0])
    .some((tag) => /^(robots|googlebot|yandex)$/i.test(attribute(tag, "name")) && /\bnoindex\b/i.test(attribute(tag, "content")));
}

function jsonLdNodes(html) {
  const nodes = [];
  const scripts = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      nodes.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      // Невалидный посторонний JSON-LD не должен скрыть проверяемые схемы.
    }
  }
  return nodes;
}

function linkHref(html, rel) {
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((candidate) =>
      attribute(candidate, "rel").toLowerCase().split(/\s+/).includes(rel)
    );
  return tag ? attribute(tag, "href") : "";
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
    const expectedCanonical = path.replace(/\/$/, "") || "/";
    const canonicalIssue = canonicalProblem(html, expectedCanonical);
    if (canonicalIssue) problems.push(canonicalIssue);
    if (hasNoindex(html, res.headers)) problems.push("noindex!");
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

function fail(label, message) {
  console.error(`✗ ${label} — ${message}`);
  failed++;
}

function pass(label) {
  console.log(`✓ ${label}`);
}

// Постоянный redirect единственной дублирующей money-страницы.
try {
  const res = await fetchWithRetry(`${BASE}/category/iphone-used`);
  const location = res.headers.get("location") || "";
  const target = location ? new URL(location, BASE).pathname : "";
  if (![301, 308].includes(res.status) || target !== "/used") fail("/category/iphone-used", `ожидался permanent redirect → /used, получено ${res.status} → ${location || "—"}`);
  else pass(`/category/iphone-used — ${res.status} → /used`);
} catch (e) {
  fail("/category/iphone-used", e.message);
}

// Стабильный архивный fixture: прямой URL не должен снова стать indexable 200.
try {
  const path = "/product/apple-ipad-air-11-m3-2024-wi-fi-128gb-blue";
  const res = await fetchWithRetry(`${BASE}${path}`);
  if (res.status !== 404) fail(path, `ожидался HTTP 404, получено ${res.status}`);
  else pass(`${path} — archive 404`);
} catch (e) {
  fail("архивный товар", e.message);
}

// Приватные страницы должны быть доступны роботу, чтобы он увидел noindex.
for (const path of ["/account", "/cart", "/auth/login", "/search?q=iphone"]) {
  try {
    const res = await fetchWithRetry(`${BASE}${path}`);
    const html = await res.text();
    if (res.status !== 200) fail(path, `HTTP ${res.status}`);
    else if (!hasNoindex(html, res.headers)) fail(path, "нет noindex");
    else pass(`${path} — noindex`);
  } catch (e) {
    fail(path, e.message);
  }
}

// Crawlable path-пагинация: настоящие ссылки, self-canonical, уникальные
// ItemList-срезы и честные 404 за пределами коллекции.
async function checkPagination(basePath) {
  try {
    const page2Path = `${basePath}/page/2`;
    const [baseRes, page2Res, page1Res, overflowRes] = await Promise.all([
      fetchWithRetry(`${BASE}${basePath}`),
      fetchWithRetry(`${BASE}${page2Path}`),
      fetchWithRetry(`${BASE}${basePath}/page/1`),
      fetchWithRetry(`${BASE}${basePath}/page/9999`),
    ]);
    const [baseHtml, page2Html] = await Promise.all([
      baseRes.text(),
      page2Res.text(),
    ]);
    const baseList = jsonLdNodes(baseHtml).find(
      (node) => node?.["@type"] === "ItemList"
    );
    const page2Nodes = jsonLdNodes(page2Html);
    const page2List = page2Nodes.find(
      (node) => node?.["@type"] === "ItemList"
    );
    const baseItems = Array.isArray(baseList?.itemListElement)
      ? baseList.itemListElement
      : [];
    const page2Items = Array.isArray(page2List?.itemListElement)
      ? page2List.itemListElement
      : [];
    const baseUrls = new Set(baseItems.map((item) => item?.url).filter(Boolean));
    const page2Urls = page2Items.map((item) => item?.url).filter(Boolean);
    const basePositions = baseItems.map((item) => Number(item?.position));
    const page2Positions = page2Items.map((item) => Number(item?.position));
    const page1Location = page1Res.headers.get("location") || "";
    const page1Target = page1Location
      ? new URL(page1Location, BASE).pathname
      : "";
    const page2CanonicalIssue = canonicalProblem(page2Html, page2Path);
    const baseNext = linkHref(baseHtml, "next");
    const page2Previous = linkHref(page2Html, "prev");
    const paginationHref = `href="${page2Path}"`;
    const problems = [];

    if (baseRes.status !== 200) problems.push(`base HTTP ${baseRes.status}`);
    if (page2Res.status !== 200) problems.push(`page/2 HTTP ${page2Res.status}`);
    if (page2CanonicalIssue) problems.push(page2CanonicalIssue);
    if (hasNoindex(page2Html, page2Res.headers)) problems.push("page/2 содержит noindex");
    if (![301, 308].includes(page1Res.status) || page1Target !== basePath) {
      problems.push(`page/1=${page1Res.status} → ${page1Location || "—"}`);
    }
    if (overflowRes.status !== 404) problems.push(`page/9999 HTTP ${overflowRes.status}`);
    if (!baseHtml.includes(paginationHref)) problems.push("нет обычной HTML-ссылки на page/2");
    if (!baseNext || new URL(baseNext, BASE).pathname !== page2Path) {
      problems.push("нет metadata rel=next на первой странице");
    }
    if (!page2Previous || new URL(page2Previous, BASE).pathname !== basePath) {
      problems.push("нет metadata rel=prev на второй странице");
    }
    if (baseItems.length !== 12 || page2Items.length !== 12) {
      problems.push(`ItemList sizes=${baseItems.length}/${page2Items.length}`);
    }
    if (basePositions.join(",") !== Array.from({ length: 12 }, (_, index) => index + 1).join(",")) {
      problems.push("неверные позиции ItemList page/1");
    }
    if (page2Positions.join(",") !== Array.from({ length: 12 }, (_, index) => index + 13).join(",")) {
      problems.push("неверные позиции ItemList page/2");
    }
    if (page2Urls.some((url) => baseUrls.has(url))) {
      problems.push("товарные URL пересекаются между page/1 и page/2");
    }
    if (page2Nodes.some((node) => node?.["@type"] === "FAQPage")) {
      problems.push("FAQPage продублирован на page/2");
    }

    if (problems.length) fail(`pagination ${basePath}`, problems.join("; "));
    else pass(`pagination ${basePath}`);
  } catch (e) {
    fail(`pagination ${basePath}`, e.message);
  }
}

for (const basePath of ["/category/iphone", "/new", "/used"]) {
  await checkPagination(basePath);
}

// Robots: подтверждённые legacy/facet параметры и отсутствие устаревшего Host.
try {
  const res = await fetchWithRetry(
    `${BASE}/robots.txt?seo-smoke=${Date.now()}`,
    3,
    { "User-Agent": "YandexBot/3.0", "Cache-Control": "no-cache" }
  );
  const body = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const cacheControl = res.headers.get("cache-control") || "";
  const sharedMaxAge = Number.parseInt(
    cacheControl.match(/\bs-maxage=(\d+)/i)?.[1] ?? "0",
    10
  );
  const yandexSections = body
    .split(/(?=^User-agent\s*:)/gmi)
    .filter((section) => /^User-agent\s*:\s*Yandex\s*$/mi.test(section));
  const yandexCleanParams = yandexSections
    .flatMap((section) => [...section.matchAll(/^Clean-param\s*:\s*([^\s#]+)/gmi)].map((match) => match[1]))
    .flatMap((value) => value.split("&"))
    .filter(Boolean);
  const cleanParamSet = new Set(yandexCleanParams);
  const missing = ["phone", "teh", "aks", "w", "q", "tubl6", "min", "max", "battery"]
    .filter((param) => !cleanParamSet.has(param));
  if (res.status !== 200) fail("robots.txt", `HTTP ${res.status}`);
  else if (!/^text\/plain\b/i.test(contentType)) fail("robots.txt", `Content-Type ${contentType || "отсутствует"}`);
  else if (sharedMaxAge > 3600) fail("robots.txt", `опасный shared cache: ${cacheControl}`);
  else if (yandexSections.length === 0) fail("robots.txt", "нет группы User-agent: Yandex");
  else if (missing.length) fail("robots.txt", `нет Clean-param: ${missing.join(", ")}`);
  else if (/^Host:/mi.test(body)) fail("robots.txt", "осталась устаревшая Host directive");
  else pass("robots.txt policy");
} catch (e) {
  fail("robots.txt", e.message);
}

// Sitemap: trade-in возвращён, дубли/пустые категории исключены, у товаров нет
// ложного lastmod от пересчёта цены.
let sitemapProductUrls = [];
let sitemapCategoryUrls = [];
try {
  const res = await fetchWithRetry(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const parsedLocs = locs.map((raw) => {
    try {
      return { raw, url: new URL(raw), problem: "" };
    } catch {
      return { raw, url: null, problem: `невалидный URL: ${raw}` };
    }
  });
  for (const loc of parsedLocs) {
    if (!loc.url) continue;
    if (loc.url.origin !== CANONICAL_ORIGIN) {
      loc.problem = `неверный origin ${loc.url.origin}: ${loc.raw}`;
    } else if (loc.url.search || loc.url.hash || /[?#]/.test(loc.raw)) {
      loc.problem = `query/hash запрещены: ${loc.raw}`;
    }
  }
  const locProblems = parsedLocs.filter((loc) => loc.problem).map((loc) => loc.problem);
  const validLocs = parsedLocs.filter((loc) => loc.url).map((loc) => loc.url);
  const unique = new Set(locs);
  const tradeInCount = validLocs.filter((url) => url.pathname === "/trade-in").length;
  const forbidden = new Set([
    "/category/iphone-used",
  ]);
  const leaked = validLocs.map((url) => url.pathname).filter((path) => forbidden.has(path));
  const paginated = validLocs
    .map((url) => url.pathname)
    .filter((path) => /\/page\/\d+$/u.test(path));
  const productBlocks = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)]
    .map((m) => m[0])
    .filter((block) => /<loc>[^<]*\/product\//.test(block));
  sitemapProductUrls = validLocs.filter((url) => url.pathname.startsWith("/product/")).map(String);
  sitemapCategoryUrls = validLocs.filter((url) => url.pathname.startsWith("/category/")).map(String);

  if (res.status !== 200) fail("sitemap.xml", `HTTP ${res.status}`);
  else if (locProblems.length) fail("sitemap.xml", `${locProblems.slice(0, 3).join("; ")}${locProblems.length > 3 ? `; ещё ${locProblems.length - 3}` : ""}`);
  else if (unique.size !== locs.length) fail("sitemap.xml", "есть дубли URL");
  else if (tradeInCount !== 1) fail("sitemap.xml", `/trade-in встречается ${tradeInCount} раз`);
  else if (leaked.length) fail("sitemap.xml", `лишние URL: ${leaked.join(", ")}`);
  else if (paginated.length) fail("sitemap.xml", `пагинация не должна быть в sitemap: ${paginated.slice(0, 3).join(", ")}`);
  else if (sitemapProductUrls.length < MIN_SITEMAP_PRODUCTS) fail("sitemap.xml", `товарных URL ${sitemapProductUrls.length}, минимум ${MIN_SITEMAP_PRODUCTS}`);
  else if (sitemapCategoryUrls.length < MIN_SITEMAP_CATEGORIES) fail("sitemap.xml", `URL категорий ${sitemapCategoryUrls.length}, минимум ${MIN_SITEMAP_CATEGORIES}`);
  else if (productBlocks.some((block) => /<lastmod>/i.test(block))) fail("sitemap.xml", "товарный lastmod снова привязан к цене");
  else pass("sitemap.xml policy");
} catch (e) {
  fail("sitemap.xml", e.message);
}

// Любая категория, попавшая в sitemap, должна оставаться indexable. Так тест
// автоматически адаптируется, когда сейчас пустую категорию наполнят товаром.
const failuresBeforeCategories = failed;
for (let i = 0; i < sitemapCategoryUrls.length; i += 4) {
  await Promise.all(sitemapCategoryUrls.slice(i, i + 4).map(async (url) => {
    const path = new URL(url).pathname;
    try {
      const res = await fetchWithRetry(`${BASE}${path}`);
      const html = await res.text();
      if (res.status !== 200) fail(`sitemap category ${path}`, `HTTP ${res.status}`);
      else if (hasNoindex(html, res.headers)) fail(`sitemap category ${path}`, "URL из sitemap содержит noindex");
    } catch (e) {
      fail(`sitemap category ${path}`, e.message);
    }
  }));
}
if (sitemapCategoryUrls.length > 0 && failed === failuresBeforeCategories) pass(`sitemap categories indexable (${sitemapCategoryUrls.length})`);

// Цена в metadata должна совпадать с Product Offer даже после очередного
// автоматического пересчёта.
const sampledProductUrls = sitemapProductUrls.length > 0
  ? [...new Set([
      sitemapProductUrls[0],
      sitemapProductUrls[Math.floor(sitemapProductUrls.length / 2)],
      sitemapProductUrls.at(-1),
    ].filter(Boolean))]
  : [];
const sampledSchemaAvailability = new Map();
for (const sitemapProductUrl of sampledProductUrls) {
  try {
    const productPath = new URL(sitemapProductUrl).pathname;
    const res = await fetchWithRetry(`${BASE}${productPath}`);
    const html = await res.text();
    const nodes = jsonLdNodes(html);
    const product = nodes.find((node) => node?.["@type"] === "Product" && node?.offers?.price);
    const meta = metaContent(html, "description");
    const prices = [...meta.matchAll(/(?:\d{4,9}|\d{1,3}(?:[\s\u00a0\u202f]|&nbsp;|&#160;|&#x0*a0;)*\d{3})\s*₽/giu)]
      .map((m) => Number(m[0].replace(/(?:&nbsp;|&#160;|&#x0*a0;|\D)/giu, "")));
    const offerPrice = Number(product?.offers?.price);
    const schemaText = JSON.stringify(product ?? {});
    const forbiddenSchemaFields = ["priceValidUntil", "shippingDetails", "hasMerchantReturnPolicy"]
      .filter((field) => schemaText.includes(`"${field}"`));
    sampledSchemaAvailability.set(productPath, String(product?.offers?.availability ?? ""));
    if (res.status !== 200) fail(`product ${productPath}`, `HTTP ${res.status}`);
    else if (!Number.isFinite(offerPrice)) fail(`product ${productPath}`, "нет Product Offer price");
    else if (prices.some((price) => price !== offerPrice)) fail(`product ${productPath}`, `meta=${prices.join(",")}, Offer=${offerPrice}`);
    else if (canonicalProblem(html, productPath)) fail(`product ${productPath}`, canonicalProblem(html, productPath));
    else if (!/https:\/\/schema\.org\/(?:InStock|BackOrder|OutOfStock)/.test(String(product?.offers?.availability ?? ""))) fail(`product ${productPath}`, "невалидный availability");
    else if (forbiddenSchemaFields.length) fail(`product ${productPath}`, `вернулись поля Offer: ${forbiddenSchemaFields.join(", ")}`);
    else pass(`product metadata/schema ${productPath}`);
  } catch (e) {
    fail(`product ${new URL(sitemapProductUrl).pathname}`, e.message);
  }
}

// Реальный YML-потребитель: oldprice обязан быть настоящей большей ценой,
// available — булевым, а физическое наличие не должно спорить с Product schema.
try {
  const res = await fetchWithRetry(`${BASE}/api/feed/yml`);
  const xml = await res.text();
  const offers = [...xml.matchAll(/<offer\b([^>]*)>([\s\S]*?)<\/offer>/gi)].map((match) => ({
    attrs: match[1],
    body: match[2],
  }));
  const problems = [];
  if (res.status !== 200) problems.push(`HTTP ${res.status}`);
  if (!/application\/xml|text\/xml/i.test(res.headers.get("content-type") || "")) problems.push("неверный Content-Type");
  if (offers.length === 0) problems.push("нет offers");
  for (const offer of offers) {
    const available = offer.attrs.match(/\bavailable=["']([^"']+)["']/i)?.[1] ?? "";
    const price = Number(offer.body.match(/<price>([^<]+)<\/price>/i)?.[1]);
    const oldPriceText = offer.body.match(/<oldprice>([^<]+)<\/oldprice>/i)?.[1];
    const oldPrice = oldPriceText == null ? null : Number(oldPriceText);
    const url = offer.body.match(/<url>([^<]+)<\/url>/i)?.[1]?.replace(/&amp;/g, "&") ?? "";
    if (!/^(true|false)$/.test(available)) problems.push("available не boolean");
    if (!Number.isFinite(price) || price <= 0) problems.push("невалидная price");
    if (oldPrice != null && (!Number.isFinite(oldPrice) || oldPrice <= price)) problems.push("oldprice не больше price");
    if (url) {
      const path = new URL(url, BASE).pathname;
      const schemaAvailability = sampledSchemaAvailability.get(path);
      if (schemaAvailability) {
        const expectedFeed = schemaAvailability.endsWith("/InStock") ? "true" : "false";
        if (available !== expectedFeed) problems.push(`${path}: YML available спорит со schema`);
      }
    }
    if (problems.length >= 8) break;
  }
  if (problems.length) fail("YML feed", [...new Set(problems)].join("; "));
  else pass(`YML feed (${offers.length} offers)`);
} catch (e) {
  fail("YML feed", e.message);
}

if (failed > 0) {
  console.error(`\nDRIFT-ГЕЙТ: ${failed} критичных проблем — проверьте деплой.`);
  process.exit(1);
}
console.log(`\nDRIFT-ГЕЙТ: базовые URL и дополнительные SEO-инварианты в порядке.`);
