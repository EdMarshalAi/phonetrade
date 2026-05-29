import { CartShell } from "@/components/cart/CartShell";
import { getCartSettings, getCheckoutBlocks } from "@/lib/content";

export const metadata = {
  title: "Корзина и оформление",
  description:
    "Оформление заказа в PhoneTrade — без регистрации или с быстрым входом.",
};

export default async function CartPage() {
  // Корзина живёт в БД (CartProvider); настройки оплаты/доставки/блоков — из админки.
  const [settings, checkoutBlocks] = await Promise.all([
    getCartSettings(),
    getCheckoutBlocks(),
  ]);
  return <CartShell settings={settings} checkoutBlocks={checkoutBlocks} />;
}
