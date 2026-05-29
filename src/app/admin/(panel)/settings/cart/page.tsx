import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { getCartSettings, getCheckoutBlocks } from "@/lib/content";
import { CartSettingsForm } from "./CartSettingsForm";

export const metadata: Metadata = { title: "Корзина" };

export default async function CartSettingsPage() {
  await requireAdmin(["admin"]);
  const [settings, blocks] = await Promise.all([getCartSettings(), getCheckoutBlocks()]);

  return (
    <>
      <PageHeader
        title="Корзина"
        description="Способы оплаты и доставки, блоки доверия под кнопкой заказа."
      />
      <CartSettingsForm initial={settings} initialBlocks={blocks} />
    </>
  );
}
