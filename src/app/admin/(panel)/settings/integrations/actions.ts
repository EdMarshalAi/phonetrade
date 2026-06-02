"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

/**
 * Отправить тестовое письмо по SMTP. Берёт переданный из формы конфиг (можно
 * проверить ДО сохранения), иначе — сохранённый в БД. Не зависит от тумблера
 * «Включено». Возвращает ошибку человекочитаемо.
 */
export async function sendTestEmail(
  to: string,
  config?: Record<string, unknown>
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin(["admin"]);
  const email = (to || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Укажите корректный email" };
  try {
    let c = config as { host?: string; port?: string | number; user?: string; pass?: string; from?: string } | undefined;
    if (!c?.host || !c?.user || !c?.pass) {
      const db = createSupabaseAdminClient();
      const { data } = await db.from("integrations").select("config").eq("key", "smtp").maybeSingle();
      c = (data?.config ?? {}) as typeof c;
    }
    if (!c?.host || !c?.user || !c?.pass) return { error: "Заполните host, пользователя и пароль" };
    const port = Number(c.port) || 465;
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: c.host,
      port,
      secure: port === 465,
      auth: { user: c.user, pass: c.pass },
    });
    await transporter.sendMail({
      from: c.from || c.user,
      to: email,
      subject: "PhoneTrade — тестовое письмо",
      text: "Это тестовое письмо из админки PhoneTrade.\n\nЕсли вы его получили — SMTP настроен правильно и письма уходят.",
    });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось отправить письмо" };
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
