"use server";

import { adminMutation } from "@/lib/admin/mutations";

export interface SeoSettings {
  title_template?: string;
  default_description?: string;
  default_og_image?: string;
  robots?: string;
  schema_org_name?: string;
}

export async function saveSeoSettings(value: SeoSettings): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "seo_settings",
      entityId: "global",
      changes: value,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("seo_settings")
          .upsert({ key: "global", value }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
