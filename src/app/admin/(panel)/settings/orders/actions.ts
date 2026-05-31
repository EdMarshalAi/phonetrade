"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { DEFAULT_ORDER_STATUSES, ORDER_COLOR_KEYS, type OrderStatusDef } from "@/lib/orders/statuses";

function slugify(raw: string, fallback: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || fallback;
}

/** Сохранить список статусов заказа в shop_settings.order_statuses. */
export async function saveOrderStatuses(items: OrderStatusDef[]): Promise<{ error?: string }> {
  // Нормализация + валидация.
  const seen = new Set<string>();
  const clean: OrderStatusDef[] = [];
  for (let i = 0; i < (items ?? []).length; i++) {
    const it = items[i] ?? ({} as OrderStatusDef);
    const label = (it.label ?? "").trim();
    if (!label) continue;
    let key = slugify(it.key ?? "", `status_${i + 1}`);
    while (seen.has(key)) key = `${key}_${i + 1}`;
    seen.add(key);
    clean.push({
      key,
      label,
      customerLabel: (it.customerLabel ?? "").trim() || label,
      color: ORDER_COLOR_KEYS.includes(it.color) ? it.color : "slate",
    });
  }
  if (clean.length === 0) {
    return { error: "Нужен хотя бы один статус" };
  }

  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "shop_settings",
      entityId: "order_statuses",
      changes: { count: clean.length },
      revalidate: ["/account/orders", "/admin/orders"],
      run: async (db) => {
        const { error } = await db
          .from("shop_settings")
          .upsert({ key: "order_statuses", value: { items: clean } }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}

export async function resetOrderStatuses(): Promise<{ error?: string }> {
  return saveOrderStatuses(DEFAULT_ORDER_STATUSES);
}
