import type { CartItem } from "@/lib/cart/types";

export type ValidatedPromo = {
  code: string;
  discountType: "percent" | "fixed" | "free_shipping";
  discountValue: number;
  minOrderAmount: number;
  appliesTo: "all" | "categories" | "products";
  appliesToIds: string[];
};

/** Подходит ли позиция под область применения промокода. */
function isEligible(promo: ValidatedPromo, item: CartItem): boolean {
  if (promo.appliesTo === "all") return true;
  if (promo.appliesTo === "categories") return promo.appliesToIds.includes(item.product.categorySlug);
  if (promo.appliesTo === "products") return promo.appliesToIds.includes(item.productId);
  return false;
}

export type PromoCalc = { amount: number; note?: string };

/**
 * Считает скидку промокода по текущей корзине и базе цены (наличные/карта).
 * Скидка применяется только к подходящим позициям (категория/товар).
 */
export function computePromoDiscount(
  promo: ValidatedPromo | null,
  items: CartItem[],
  base: "cash" | "card"
): PromoCalc {
  if (!promo) return { amount: 0 };
  if (promo.discountType === "free_shipping") return { amount: 0, note: "Бесплатная доставка" };

  const subtotal = items.reduce(
    (s, i) => s + (base === "card" ? i.product.priceCard : i.product.priceCash) * i.qty,
    0
  );
  if (promo.minOrderAmount > 0 && subtotal < promo.minOrderAmount) {
    return { amount: 0, note: `Промокод действует от ${new Intl.NumberFormat("ru-RU").format(promo.minOrderAmount)} ₽` };
  }

  const eligibleBase = items
    .filter((i) => isEligible(promo, i))
    .reduce((s, i) => s + (base === "card" ? i.product.priceCard : i.product.priceCash) * i.qty, 0);

  if (eligibleBase <= 0) return { amount: 0, note: "Промокод не применим к товарам в корзине" };

  const amount =
    promo.discountType === "percent"
      ? Math.round((eligibleBase * promo.discountValue) / 100)
      : Math.min(promo.discountValue, eligibleBase);

  return { amount: Math.max(0, amount) };
}
