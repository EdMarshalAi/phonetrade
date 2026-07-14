/**
 * Pure commerce helpers shared by the storefront, structured data and feeds.
 * Keep this module browser-safe: ProductBuyPanel and CartItemsSection import it.
 */

const RUB_PRICE_TOKEN =
  /(?:\d{4,9}|\d{1,3}(?:(?:[ \t\u00a0\u202f]|&nbsp;|&#160;|&#x0*a0;)\d{3})+)(?:[.,]\d{1,2})?\s*(?:₽|руб(?:л(?:ей|я)?)?\.?)/giu;

const RUB_FORMATTER = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

/** Replaces every explicit ruble price in stored SEO copy with the live cash price. */
export function syncProductSeoText(
  text: string | null | undefined,
  priceCash: number
): string {
  if (!text) return "";
  if (!Number.isFinite(priceCash) || priceCash <= 0) return text;
  const storedAmounts = [...text.matchAll(RUB_PRICE_TOKEN)].map((match) => {
    const withoutHtmlSpaces = match[0].replace(/&nbsp;|&#160;|&#x0*a0;/giu, "");
    return (withoutHtmlSpaces.match(/\d+/gu) ?? []).join("");
  });
  if (storedAmounts.length === 0) return text;
  // В текущем каталоге цена повторяется в описании, но других денежных сумм
  // нет. Если редактор позже добавит стоимость доставки/рассрочки/скидку,
  // неоднозначный текст не переписываем целиком и не искажаем факты.
  if (new Set(storedAmounts).size > 1) return text;
  const currentPrice = `${RUB_FORMATTER.format(Math.round(priceCash))} ₽`;
  return text.replace(RUB_PRICE_TOKEN, currentPrice);
}

/** Also removes the confirmed cross-brand phrase injected by an old SEO script. */
export function syncProductSeoContent(
  text: string | null | undefined,
  priceCash: number,
  product: ProductBrandInput
): string {
  const synced = syncProductSeoText(text, priceCash);
  const brand = resolveProductBrand(product);
  if (!synced || !brand || brand === "Apple") return synced;
  return synced.replace(/оригинал\s+Apple/giu, `оригинальный товар бренда ${brand}`);
}

export type ProductBrandInput = {
  brand?: string | null;
  title?: string | null;
  categorySlug?: string | null;
};

const KNOWN_BRANDS: Array<[RegExp, string]> = [
  [/\bdyson\b/i, "Dyson"],
  [/\bhollyland\b|\blark\s*m\d?\b/i, "Hollyland"],
  [/\bsamsung\b|\bgalaxy\b/i, "Samsung"],
  [/\bsony\b|\bplaystation\b|\bdualsense\b|\bps\s*5\b/i, "Sony"],
  [/яндекс|\byandex\b|алис[а-яё]*|станци[яи]/i, "Яндекс"],
  [/\bjbl\b/i, "JBL"],
  [/\bmarshall\b/i, "Marshall"],
  [/\bbeats\b/i, "Beats"],
  [/\bdji\b/i, "DJI"],
  [/\bgarmin\b/i, "Garmin"],
  [/\bxiaomi\b|\bredmi\b/i, "Xiaomi"],
  [/\bhuawei\b/i, "Huawei"],
  [/\bhonor\b/i, "Honor"],
  [/\bnintendo\b/i, "Nintendo"],
  [/\bgoogle\s+pixel\b/i, "Google"],
  [/\bapple\b|\biphone\b|\bipad\b|\bmacbook\b|\bimac\b|\bmac\s+(?:mini|studio|pro)\b|\bairpods\b|\bhomepod\b/i, "Apple"],
];

/** Returns an explicit or safely inferred brand. Unknown products have no brand. */
export function resolveProductBrand(input: ProductBrandInput): string | null {
  const explicit = input.brand?.trim();
  if (explicit && !/^(?:other|другое|без бренда)$/i.test(explicit)) {
    const normalized = KNOWN_BRANDS.find(([pattern]) => pattern.test(explicit));
    return normalized?.[1] ?? explicit;
  }

  const haystack = `${input.title ?? ""} ${input.categorySlug ?? ""}`.trim();
  if (!haystack) return null;
  return KNOWN_BRANDS.find(([pattern]) => pattern.test(haystack))?.[1] ?? null;
}

export type ProductAvailabilityInput = {
  stock?: number | null;
  inStock?: boolean | null;
  isAvailable?: boolean | null;
};

export type ProductAvailabilityKind = "in-stock" | "backorder" | "out-of-stock";

export type ResolvedProductAvailability = {
  kind: ProductAvailabilityKind;
  label: "В наличии" | "Под заказ" | "Нет в наличии";
  physicalInStock: boolean;
  canOrder: boolean;
  feedAvailable: boolean;
  schemaAvailability:
    | "https://schema.org/InStock"
    | "https://schema.org/BackOrder"
    | "https://schema.org/OutOfStock";
};

/**
 * Numeric stock is authoritative when present. The legacy inStock flag is used
 * only when the shop does not track an exact quantity for a product.
 */
export function resolveProductAvailability(
  input: ProductAvailabilityInput,
  allowZeroStock: boolean
): ResolvedProductAvailability {
  const hasNumericStock =
    typeof input.stock === "number" && Number.isFinite(input.stock);
  const physicalInStock = hasNumericStock
    ? Number(input.stock) > 0
    : input.inStock === true;
  const availableForOrder = input.isAvailable !== false;
  const canOrder = availableForOrder && (physicalInStock || allowZeroStock);
  const feedAvailable = availableForOrder && physicalInStock;

  if (feedAvailable) {
    return {
      kind: "in-stock",
      label: "В наличии",
      physicalInStock,
      canOrder,
      feedAvailable,
      schemaAvailability: "https://schema.org/InStock",
    };
  }

  if (canOrder) {
    return {
      kind: "backorder",
      label: "Под заказ",
      physicalInStock,
      canOrder,
      feedAvailable,
      schemaAvailability: "https://schema.org/BackOrder",
    };
  }

  return {
    kind: "out-of-stock",
    label: "Нет в наличии",
    physicalInStock,
    canOrder,
    feedAvailable,
    schemaAvailability: "https://schema.org/OutOfStock",
  };
}
