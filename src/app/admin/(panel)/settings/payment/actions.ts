"use server";

import { adminMutation } from "@/lib/admin/mutations";

export interface PaymentSettings {
  sbp_enabled?: boolean;
  card_enabled?: boolean;
  on_delivery_enabled?: boolean;
  installment_enabled?: boolean;
  sbp_provider?: string;
  card_provider?: string;
  installment_partner?: string;
  installment_min?: number;
  installment_terms?: string;
}

export async function savePaymentSettings(value: PaymentSettings): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "shop_settings",
      entityId: "payment",
      changes: value,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("shop_settings")
          .upsert({ key: "payment", value }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
