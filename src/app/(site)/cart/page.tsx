import { CartShell } from "@/components/cart/CartShell";

export const metadata = {
  title: "Корзина и оформление",
  description:
    "Оформление заказа в PhoneTrade — без регистрации или с быстрым входом.",
};

export default function CartPage() {
  // Корзина живёт в БД (CartProvider, анонимная по куке) — никаких моков.
  return <CartShell />;
}
