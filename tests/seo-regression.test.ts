import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  reconcileAvailabilityBadges,
  resolveProductAvailability,
  resolveProductBrand,
  syncProductSeoContent,
  syncProductSeoText,
} from "@/lib/product-commerce";
import { calculateCartTotals } from "@/lib/cart/totals";
import type { Product } from "@/lib/data/products";
import type { CartItem } from "@/lib/cart/types";
import type { CartDeliveryOption, CartPaymentMethod } from "@/lib/content";
import { normalizePublishedCopy } from "@/lib/content";
import { categoryPath } from "@/lib/catalog/category-path";
import {
  CATALOG_PAGE_SIZE,
  hasCatalogViewParams,
  pagePath,
  parsePageNumber,
  searchParamsString,
  slicePage,
  totalPages,
} from "@/lib/catalog/pagination";
import { GET as getRobots, ROBOTS_TEXT } from "@/app/robots.txt/route";
import { productSchema } from "@/lib/admin/schemas";
import { stripInjectedSeoBlocks } from "@/lib/seo/clean-content";

const normalizeSpaces = (value: string) => value.replace(/[\s\u00a0\u202f]+/gu, " ");

test("runtime SEO copy always uses the current cash price", () => {
  const expected = "Цена 93 000 ₽";
  for (const stored of [
    "Цена 94 000 ₽",
    "Цена 94\u00a0000 ₽",
    "Цена 94\u202f000 ₽",
    "Цена 94&nbsp;000 ₽",
    "Цена 94000 руб.",
  ]) {
    assert.equal(normalizeSpaces(syncProductSeoText(stored, 93_000)), expected);
  }
  assert.equal(syncProductSeoText("Модель 2026 года", 93_000), "Модель 2026 года");
  assert.equal(
    syncProductSeoText("Цена 94 000 ₽, рассрочка от 7 000 ₽/мес", 93_000),
    "Цена 94 000 ₽, рассрочка от 7 000 ₽/мес"
  );
  assert.equal(
    normalizeSpaces(syncProductSeoText("Цена 94 000 ₽; в карточке 94&#160;000 руб.", 93_000)),
    "Цена 93 000 ₽; в карточке 93 000 ₽"
  );
});

test("cross-brand SEO copy is not labelled as Apple", () => {
  const synced = syncProductSeoContent(
    "<p>Samsung S26 — оригинал Apple с гарантией. Цена 95 000 ₽.</p>",
    92_000,
    { title: "Samsung S26 Ultra", brand: "Samsung", categorySlug: "samsung" }
  );
  assert.match(synced, /оригинальный товар бренда Samsung/u);
  assert.doesNotMatch(synced, /оригинал Apple/u);
  assert.match(normalizeSpaces(synced), /92 000 ₽/u);
});

test("marked keyword-stuffing append is removed without touching authored copy", () => {
  const input = [
    "<p>Полезное описание товара и его характеристик.</p>",
    "<!--seo-kw-->",
    "<h2>256 ГБ Чёрный — купить в Белгороде</h2>",
    "<p>Купить айфон цена купить айфон Белгород.</p>",
    "<!--/seo-kw-->",
  ].join("\n");
  assert.equal(
    stripInjectedSeoBlocks(input),
    "<p>Полезное описание товара и его характеристик.</p>"
  );
  assert.equal(stripInjectedSeoBlocks("<p>Редакторский текст</p>"), "<p>Редакторский текст</p>");
});

test("brand resolver never defaults unknown products to Apple", () => {
  assert.equal(resolveProductBrand({ title: "Dyson Airwrap HS08" }), "Dyson");
  assert.equal(resolveProductBrand({ title: "Hollyland Lark M2", brand: "Other" }), "Hollyland");
  assert.equal(resolveProductBrand({ title: "Неизвестный аксессуар", brand: null }), null);
});

test("numeric stock is authoritative for schema, feed and ordering", () => {
  const inStock = resolveProductAvailability({ stock: 2, inStock: false, isAvailable: true }, false);
  assert.equal(inStock.kind, "in-stock");
  assert.equal(inStock.feedAvailable, true);

  const backorder = resolveProductAvailability({ stock: 0, inStock: true, isAvailable: true }, true);
  assert.equal(backorder.kind, "backorder");
  assert.equal(backorder.feedAvailable, false);
  assert.equal(backorder.canOrder, true);

  const unavailable = resolveProductAvailability({ stock: 0, inStock: true, isAvailable: true }, false);
  assert.equal(unavailable.kind, "out-of-stock");
  assert.equal(unavailable.canOrder, false);

  const legacy = resolveProductAvailability({ stock: null, inStock: true, isAvailable: true }, false);
  assert.equal(legacy.kind, "in-stock");
});

test("blank stock inputs stay unknown instead of becoming zero", () => {
  assert.equal(productSchema.shape.stock.parse(""), null);
  assert.equal(productSchema.shape.stock.parse(undefined), null);
  assert.equal(productSchema.shape.stock.parse("0"), 0);
  assert.equal(productSchema.shape.stock.parse("7"), 7);
});

test("availability badges cannot contradict calculated availability", () => {
  assert.deepEqual(
    reconcileAvailabilityBadges(["new", "check-availability"], "in-stock"),
    ["new", "in-stock"]
  );
  assert.deepEqual(
    reconcileAvailabilityBadges(["new", "in-stock"], "backorder"),
    ["new", "check-availability"]
  );
  assert.deepEqual(
    reconcileAvailabilityBadges(["new", "check-availability"], "out-of-stock"),
    ["new"]
  );
});

test("cart total includes delivery and cannot diverge between UI and server", () => {
  const product = {
    id: "p1",
    title: "Test",
    categorySlug: "iphone",
    model: "Test",
    color: "Black",
    image: "/test.png",
    priceCash: 90_000,
    priceCard: 100_000,
  } as Product;
  const items: CartItem[] = [{ productId: product.id, product, qty: 1 }];
  const payment: CartPaymentMethod = {
    key: "sbp", enabled: true, label: "СБП", note: "", description: "",
    icon: null, priceBase: "cash", surcharge: 0,
  };
  const delivery: CartDeliveryOption = {
    key: "courier", enabled: true, label: "Курьер", note: "", description: "",
    icon: null, requiresAddress: true, price: 1_000, freeFrom: 0,
  };

  const totals = calculateCartTotals({ items, payment, delivery, promo: null });
  assert.deepEqual(
    { subtotal: totals.subtotal, delivery: totals.delivery, total: totals.total },
    { subtotal: 90_000, delivery: 1_000, total: 91_000 }
  );

  const freeShipping = calculateCartTotals({
    items,
    payment,
    delivery,
    promo: {
      code: "FREE",
      discountType: "free_shipping",
      discountValue: 0,
      minOrderAmount: 50_000,
      appliesTo: "all",
      appliesToIds: [],
    },
  });
  assert.equal(freeShipping.delivery, 0);
  assert.equal(freeShipping.total, 90_000);
  assert.equal(freeShipping.freeShippingApplied, true);

  const belowMinimum = calculateCartTotals({
    items,
    payment,
    delivery,
    promo: {
      code: "FREE",
      discountType: "free_shipping",
      discountValue: 0,
      minOrderAmount: 100_000,
      appliesTo: "all",
      appliesToIds: [],
    },
  });
  assert.equal(belowMinimum.delivery, 1_000);
  assert.equal(belowMinimum.freeShippingApplied, false);

  const pickup = calculateCartTotals({
    items,
    payment,
    delivery: { ...delivery, key: "pickup", price: 0, requiresAddress: false },
    promo: {
      code: "FREE",
      discountType: "free_shipping",
      discountValue: 0,
      minOrderAmount: 0,
      appliesTo: "all",
      appliesToIds: [],
    },
  });
  assert.equal(pickup.freeShippingApplied, false);
});

test("canonical category path and published copy remove confirmed duplicates", () => {
  assert.equal(categoryPath("iphone-used"), "/used");
  assert.equal(categoryPath("iphone-17"), "/category/iphone-17");
  assert.equal(
    normalizePublishedCopy("Купить iPhone в Старый Осколе"),
    "Купить iPhone в Старом Осколе"
  );
});

test("catalog pagination uses stable path URLs and rejects ambiguous pages", () => {
  assert.equal(pagePath("/category/iphone", 1), "/category/iphone");
  assert.equal(pagePath("/category/iphone", 2), "/category/iphone/page/2");
  assert.equal(pagePath("/new", 3), "/new/page/3");
  assert.equal(pagePath("/used", 4), "/used/page/4");
  assert.equal(pagePath("/", 2), "/page/2");

  assert.equal(parsePageNumber("1"), 1);
  assert.equal(parsePageNumber("42"), 42);
  for (const value of ["0", "02", "-1", "1.5", "page-2", "9007199254740992"]) {
    assert.equal(parsePageNumber(value), null);
  }

  assert.equal(totalPages(0), 0);
  assert.equal(totalPages(CATALOG_PAGE_SIZE), 1);
  assert.equal(totalPages(CATALOG_PAGE_SIZE + 1), 2);
});

test("catalog pagination slices cover products once and preserve global order", () => {
  const products = Array.from({ length: 25 }, (_, index) => index + 1);
  const pages = [1, 2, 3].map((page) =>
    slicePage(products, page, CATALOG_PAGE_SIZE)
  );

  assert.deepEqual(pages[0], products.slice(0, 12));
  assert.deepEqual(pages[1], products.slice(12, 24));
  assert.deepEqual(pages[2], products.slice(24));
  assert.deepEqual(pages.flat(), products);
  assert.equal(new Set(pages.flat()).size, products.length);
});

test("catalog view parameters reset path pagination while tracking parameters do not", () => {
  assert.equal(hasCatalogViewParams({ model: "iPhone 16" }), true);
  assert.equal(hasCatalogViewParams({ sort: "price-desc" }), true);
  assert.equal(hasCatalogViewParams({ min: "50000", max: "100000" }), true);
  assert.equal(hasCatalogViewParams({ page: "2", utm_source: "yandex" }), false);
  assert.equal(hasCatalogViewParams({}), false);
  assert.equal(
    searchParamsString({ model: "iPhone 16", color: ["black", "white"] }),
    "model=iPhone+16&color=black&color=white"
  );
});

test("SEO crawl policy keeps confirmed regression guards", () => {
  const root = process.cwd();
  const robots = ROBOTS_TEXT;
  const yandexSection = robots
    .split(/\r?\n\s*\r?\n/u)
    .find((section) => /^User-agent\s*:\s*Yandex\s*$/imu.test(section));
  assert.ok(yandexSection, "robots.txt must contain a Yandex group");
  const cleanParams = new Set(
    [...yandexSection.matchAll(/^Clean-param\s*:\s*([^\s#]+)/gimu)]
      .flatMap((match) => match[1].split("&"))
      .filter(Boolean)
  );
  for (const param of ["phone", "teh", "aks", "w", "q", "tubl6", "min", "max", "battery", "page"]) {
    assert.ok(cleanParams.has(param), `Yandex Clean-param must contain ${param}`);
  }
  assert.doesNotMatch(robots, /^Host:/mu);
  const robotsResponse = getRobots();
  assert.equal(robotsResponse.status, 200);
  assert.match(robotsResponse.headers.get("content-type") ?? "", /^text\/plain\b/iu);
  assert.doesNotMatch(robotsResponse.headers.get("cache-control") ?? "", /s-maxage=(?:[4-9]\d{3,}|\d{5,})/iu);

  const nextConfig = readFileSync(resolve(root, "next.config.ts"), "utf8");
  assert.match(nextConfig, /source:\s*["']\/category\/iphone-used["'][\s\S]*destination:\s*["']\/used["']/u);

  const products = readFileSync(resolve(root, "src/lib/products.ts"), "utf8");
  const getter = products.slice(products.indexOf("export const getProductById"), products.indexOf("export async function getCategoryProductCount"));
  assert.match(getter, /cache\(async/u);
  assert.match(getter, /\.eq\("status",\s*"published"\)/u);

  const sitemap = readFileSync(resolve(root, "src/app/sitemap.ts"), "utf8");
  assert.match(sitemap, /abs\("\/trade-in"\)/u);
  const productRoutes = sitemap.slice(sitemap.indexOf("const productRoutes"), sitemap.indexOf("const pageRoutes"));
  assert.doesNotMatch(productRoutes, /lastModified/u);

  const productPage = readFileSync(resolve(root, "src/app/(site)/product/[id]/page.tsx"), "utf8");
  assert.doesNotMatch(productPage, /priceValidUntil|shippingDetails|hasMerchantReturnPolicy/u);

  const yml = readFileSync(resolve(root, "src/app/api/feed/yml/route.ts"), "utf8");
  assert.match(yml, /priceOld\s*&&\s*priceOld\s*>\s*cash/u);
  assert.match(yml, /availability\.feedAvailable/u);

  const orderAction = readFileSync(resolve(root, "src/lib/cart/order-actions.ts"), "utf8");
  assert.match(orderAction, /MAX_ORDER_LINES/u);
  assert.match(orderAction, /expectedTotal\s*!==\s*totals\.total/u);
  assert.doesNotMatch(orderAction, /from\("products"\)[\s\S]{0,120}\.select\("\*"\)/u);
});

test("checkout and deploy keep their atomicity and idempotency guards", () => {
  const root = process.cwd();
  const cartShell = readFileSync(resolve(root, "src/components/cart/CartShell.tsx"), "utf8");
  assert.match(cartShell, /sessionStorage\.getItem\(CHECKOUT_ATTEMPT_KEY\)/u);
  assert.match(cartShell, /attemptId,/u);
  assert.match(cartShell, /clearCheckoutAttemptId\(attemptId\)/u);

  const orderAction = readFileSync(resolve(root, "src/lib/cart/order-actions.ts"), "utf8");
  const replayLookup = orderAction.indexOf("[placeOrder] idempotency lookup:");
  const productLookup = orderAction.indexOf('.from("products")');
  assert.ok(replayLookup > 0 && replayLookup < productLookup, "replay must be recovered before product revalidation");
  assert.match(orderAction, /after\(async \(\) =>/u);

  const migration = readFileSync(
    resolve(root, "supabase/migrations/0022_storefront_order_transaction.sql"),
    "utf8"
  );
  assert.match(migration, /pg_advisory_xact_lock/u);
  assert.match(migration, /from public\.products[\s\S]*for update/u);
  assert.match(migration, /set stock = stock - v_item\.qty/u);
  assert.match(migration, /'replayed', true/u);

  const deploy = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf8");
  assert.match(deploy, /github\.ref == 'refs\/heads\/main'/u);
  assert.match(deploy, /PORT=3001 HOSTNAME=127\.0\.0\.1/u);
  const candidateSmoke = deploy.indexOf("SEO smoke against isolated candidate");
  const liveSwitch = deploy.indexOf("Switch live PM2 to verified candidate");
  const liveSmoke = deploy.indexOf("SEO smoke against live domain");
  const save = deploy.indexOf("pm2 save");
  assert.ok(candidateSmoke > 0 && candidateSmoke < liveSwitch, "candidate smoke must precede live switch");
  assert.ok(liveSwitch < liveSmoke && liveSmoke < save, "PM2 must be saved only after live smoke");
});
