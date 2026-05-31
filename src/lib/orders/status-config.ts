"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ORDER_STATUSES, type OrderStatusDef } from "./statuses";

/**
 * Список статусов заказа из настроек (`shop_settings.order_statuses`).
 * Фолбэк — DEFAULT_ORDER_STATUSES. Читается и в админке, и в ЛК.
 */
export async function getOrderStatusConfig(): Promise<OrderStatusDef[]> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("shop_settings")
      .select("value")
      .eq("key", "order_statuses")
      .maybeSingle();
    const items = (data?.value as { items?: OrderStatusDef[] } | null)?.items;
    if (Array.isArray(items) && items.length > 0) {
      return items.filter((i) => i && typeof i.key === "string" && i.key);
    }
  } catch {
    /* фолбэк ниже */
  }
  return DEFAULT_ORDER_STATUSES;
}
