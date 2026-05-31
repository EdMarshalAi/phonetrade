import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { getOrderStatusConfig } from "@/lib/orders/status-config";
import { OrderStatusForm } from "./OrderStatusForm";

export const metadata: Metadata = { title: "Статусы заказов" };

export default async function OrderStatusesSettingsPage() {
  await requireAdmin(["admin"]);
  const items = await getOrderStatusConfig();
  return (
    <>
      <PageHeader
        title="Статусы заказов"
        description="Список статусов, их названия для клиента и цвет. Используются в карточке заказа в админке и в личном кабинете покупателя."
      />
      <OrderStatusForm initial={items} />
    </>
  );
}
