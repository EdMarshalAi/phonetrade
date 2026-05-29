"use server";

import { adminMutation } from "@/lib/admin/mutations";

export interface ShopGeneral {
  name?: string;
  address?: string;
  lat?: string;
  lng?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  working_hours?: string;
  vk?: string;
  whatsapp?: string;
  telegram?: string;
  inn?: string;
  ogrn?: string;
  legal_address?: string;
}

export async function saveShopSettings(value: ShopGeneral): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "shop_settings",
      entityId: "general",
      changes: value,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("shop_settings").upsert({ key: "general", value }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
