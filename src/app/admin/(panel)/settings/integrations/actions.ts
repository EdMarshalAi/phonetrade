"use server";

import { adminMutation } from "@/lib/admin/mutations";

export type IntegrationKey =
  | "telegram"
  | "metrika"
  | "ga4"
  | "yandex_maps"
  | "yookassa"
  | "tbank"
  | "smtp";

export interface IntegrationRow {
  key: IntegrationKey;
  config: Record<string, unknown>;
  is_enabled: boolean;
}

export async function saveIntegration(
  key: IntegrationKey,
  config: Record<string, unknown>,
  is_enabled: boolean
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "integrations",
      entityId: key,
      changes: { config, is_enabled },
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("integrations")
          .upsert({ key, config, is_enabled }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
