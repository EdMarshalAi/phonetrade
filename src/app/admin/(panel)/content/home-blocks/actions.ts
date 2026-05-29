"use server";

import { adminMutation } from "@/lib/admin/mutations";

export interface HomeBlocksVisibility {
  bento: boolean;
  trade_in: boolean;
  advantages: boolean;
}

/** Сохраняет видимость блоков главной (shop_settings key='home_blocks'). */
export async function saveHomeBlocksVisibility(value: HomeBlocksVisibility): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin", "content"],
      action: "settings_change",
      entityType: "settings",
      entityId: "home_blocks",
      changes: value,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("shop_settings").upsert({ key: "home_blocks", value }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
