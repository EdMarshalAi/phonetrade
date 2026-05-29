"use server";

import { adminMutation } from "@/lib/admin/mutations";

export interface DeliverySettings {
  pickup_enabled?: boolean;
  pickup_address?: string;
  courier_enabled?: boolean;
  courier_price?: number;
  free_from?: number;
  zones?: string;
  note?: string;
}

export async function saveDeliverySettings(value: DeliverySettings): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "shop_settings",
      entityId: "delivery",
      changes: value,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("shop_settings")
          .upsert({ key: "delivery", value }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
