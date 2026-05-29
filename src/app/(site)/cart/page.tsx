import { ALL_PRODUCTS } from "@/lib/data/products";
import { CartShell } from "@/components/cart/CartShell";
import type { CartItem } from "@/lib/cart/types";

export const metadata = {
  title: "Корзина и оформление",
  description:
    "Оформление заказа в PhoneTrade — без регистрации или с быстрым входом.",
};

export default function CartPage() {
  // Mock-cart for now. Replace with persisted cart from cookie/DB when wired.
  const seedIds = ["ip17-128-black", "airpods-pro-3"];
  const initialItems: CartItem[] = seedIds
    .map((id) => ALL_PRODUCTS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ productId: p.id, product: p, qty: 1 }));

  return <CartShell initialItems={initialItems} />;
}
