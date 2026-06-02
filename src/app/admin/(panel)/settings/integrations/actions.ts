"use server";

import { adminMutation } from "@/lib/admin/mutations";

/** Ключ интеграции: встроенные (telegram/metrika/smtp/openai) или кастомные `custom_*`. */
export type IntegrationKey = string;

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
      changes: { is_enabled },
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

/** Создать кастомную интеграцию-код (счётчик/пиксель/виджет — вставка кода). */
export async function createCustomIntegration(input: {
  title: string;
  code: string;
  placement: "head" | "body_end";
}): Promise<{ key?: string; error?: string }> {
  const title = input.title.trim();
  const code = input.code.trim();
  if (!title) return { error: "Укажите название" };
  if (!code) return { error: "Вставьте код" };
  const placement = input.placement === "head" ? "head" : "body_end";
  const key = `custom_${Math.abs(hashStr(title + code)).toString(36)}${code.length.toString(36)}`;
  try {
    await adminMutation({
      roles: ["admin"],
      action: "create",
      entityType: "integrations",
      entityId: key,
      changes: { title, placement },
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("integrations")
          .upsert({ key, config: { type: "code", title, code, placement }, is_enabled: true }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return { key };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка создания" };
  }
}

export async function deleteIntegration(key: IntegrationKey): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "delete",
      entityType: "integrations",
      entityId: key,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("integrations").delete().eq("key", key);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}
