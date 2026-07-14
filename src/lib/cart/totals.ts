import type { CartItem } from "@/lib/cart/types";
import type { CartDeliveryOption, CartPaymentMethod } from "@/lib/content";
import { computePromoDiscount, type ValidatedPromo } from "@/lib/cart/promo";

export type CartTotals = {
  base: "cash" | "card";
  subtotal: number;
  discountCash: number;
  surcharge: number;
  delivery: number;
  promoDiscount: number;
  promoNote?: string;
  freeShippingApplied: boolean;
  total: number;
};

/**
 * Единый расчёт итогов для виджета корзины, отправки заказа и сервера.
 * Все суммы округляются до рублей тем же способом во всех трёх местах.
 */
export function calculateCartTotals({
  items,
  payment,
  delivery,
  promo,
}: {
  items: CartItem[];
  payment: CartPaymentMethod | undefined;
  delivery: CartDeliveryOption | undefined;
  promo: ValidatedPromo | null;
}): CartTotals {
  const base = payment?.priceBase === "card" ? "card" : "cash";
  const subtotal = items.reduce(
    (sum, item) => sum + (base === "card" ? item.product.priceCard : item.product.priceCash) * item.qty,
    0
  );
  const discountCash = base === "cash"
    ? items.reduce(
        (sum, item) => sum + Math.max(0, item.product.priceCard - item.product.priceCash) * item.qty,
        0
      )
    : 0;
  const surcharge = (payment?.surcharge ?? 0) > 0
    ? Math.round((subtotal * (payment?.surcharge ?? 0)) / 100)
    : 0;
  const promoResult = computePromoDiscount(promo, items, base);
  const deliveryPrice = delivery &&
    delivery.price > 0 && !(delivery.freeFrom > 0 && subtotal >= delivery.freeFrom)
      ? delivery.price
      : 0;
  const deliveryCost = promoResult.freeShipping ? 0 : deliveryPrice;
  const promoDiscount = promoResult.amount;
  const freeShippingApplied = promoResult.freeShipping === true && deliveryPrice > 0;

  return {
    base,
    subtotal,
    discountCash,
    surcharge,
    delivery: deliveryCost,
    promoDiscount,
    promoNote: promoResult.freeShipping && !freeShippingApplied
      ? "Для выбранного способа доставка уже бесплатна"
      : promoResult.note,
    freeShippingApplied,
    total: Math.max(0, subtotal + surcharge + deliveryCost - promoDiscount),
  };
}
