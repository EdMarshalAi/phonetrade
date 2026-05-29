"use server";

import { adminMutation } from "@/lib/admin/mutations";
import type { ProductOption, ProductBadge } from "@/lib/content";

const STAFF = ["admin", "manager", "content"] as const;

/** Сохраняет реестр опций и бейджей товаров (shop_settings). */
export async function saveProductRegistry(
  options: ProductOption[],
  badges: ProductBadge[]
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "settings_change",
      entityType: "settings",
      entityId: "product_registry",
      changes: { options: options.length, badges: badges.length },
      revalidate: ["/", "/admin/catalog/products"],
      run: async (db) => {
        const normOptions = options.map((o, i) => ({
          key: o.key,
          label: o.label.trim(),
          field: o.field ?? null,
          values: o.values.map((v) => v.trim()).filter(Boolean),
          sort: i,
        }));
        const normBadges = badges.map((b, i) => ({
          key: b.key,
          label: b.label.trim(),
          bg: b.bg || "#1d1d1f",
          fg: b.fg || "#ffffff",
          icon: b.icon ?? null,
          tooltip: (b.tooltip ?? "").trim(),
          sort: i,
        }));
        const { error: e1 } = await db
          .from("shop_settings")
          .upsert({ key: "product_options", value: normOptions }, { onConflict: "key" });
        if (e1) throw e1;
        const { error: e2 } = await db
          .from("shop_settings")
          .upsert({ key: "product_badges", value: normBadges }, { onConflict: "key" });
        if (e2) throw e2;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения настроек" };
  }
}
