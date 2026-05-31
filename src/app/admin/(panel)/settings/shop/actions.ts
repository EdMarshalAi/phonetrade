"use server";

import { adminMutation } from "@/lib/admin/mutations";
import type { ShopContactLink } from "@/lib/content";

export interface ShopGeneral {
  name?: string;
  address?: string;
  lat?: string;
  lng?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  phone_enabled?: boolean;
  phone2_enabled?: boolean;
  email_enabled?: boolean;
  working_hours?: string;
  vk?: string;
  whatsapp?: string;
  telegram?: string;
  legal_entity?: string;
  inn?: string;
  ogrn?: string;
  legal_address?: string;
  bank_details?: string;
  /** Режим технических работ — сайт закрыт для посетителей. */
  maintenance?: boolean;
  maintenance_message?: string;
  contacts?: ShopContactLink[];
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
