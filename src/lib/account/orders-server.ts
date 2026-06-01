"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorefrontUser } from "@/lib/auth/server-user";
import { getOrderStatusConfig } from "@/lib/orders/status-config";
import { findStatus } from "@/lib/orders/statuses";
import type { Order } from "./orders";

/**
 * Заказы ТЕКУЩЕГО пользователя из БД. Идентификация — строго по серверной
 * cookie-сессии (getStorefrontUser), а НЕ по телефону с клиента (иначе IDOR:
 * любой мог бы запросить чужие заказы). Параметр сохранён для обратной
 * совместимости вызовов, но игнорируется.
 */
export async function getOrdersByPhone(_phone?: string): Promise<Order[]> {
  const user = await getStorefrontUser();
  const key = user?.phone ? user.phone.replace(/\D/g, "") : "";
  if (!key) return [];
  const db = createSupabaseAdminClient();
  const [{ data }, statuses] = await Promise.all([
    db
      .from("orders")
      .select(
        "id, order_number, status, created_at, delivery_method, delivery_address, total, order_items(product_id, title, image, qty, price_cash)"
      )
      .eq("phone", key)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    getOrderStatusConfig(),
  ]);

  type Row = {
    id: string;
    order_number: string | null;
    status: string | null;
    created_at: string;
    delivery_method: string | null;
    delivery_address: string | null;
    total: number | null;
    order_items: { product_id: string; title: string; image: string | null; qty: number; price_cash: number | null }[] | null;
  };

  return ((data ?? []) as Row[]).map((o) => {
    const def = findStatus(statuses, o.status);
    return {
      id: o.order_number || o.id,
      date: o.created_at.slice(0, 10),
      statusKey: o.status ?? "",
      statusLabel: def?.customerLabel || "В обработке",
      statusColor: def?.color ?? "slate",
      delivery: o.delivery_method === "courier" ? "Курьер по Белгороду" : "Самовывоз",
      total: o.total ?? 0,
      items: (o.order_items ?? []).map((it) => ({
        id: it.product_id,
        title: it.title,
        image: it.image ?? "",
        qty: it.qty,
        priceCash: it.price_cash ?? 0,
      })),
    };
  });
}
