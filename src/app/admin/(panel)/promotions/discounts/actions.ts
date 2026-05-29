"use server";

import { adminMutation } from "@/lib/admin/mutations";

export interface DiscountsSettings {
  cash_discount_type?: "percent" | "fixed";
  cash_discount_value?: number;
  loyalty_note?: string;
}

export async function saveDiscountsSettings(value: DiscountsSettings): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin", "manager"],
      action: "update",
      entityType: "shop_settings",
      entityId: "discounts",
      changes: value,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("shop_settings")
          .upsert({ key: "discounts", value }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
