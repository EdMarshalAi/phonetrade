"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { phoneToEmail } from "@/lib/auth/phone-email";

/**
 * Регистрация покупателя: создаём пользователя в Supabase Auth (без подтверждения
 * почты, т.к. это синтетический email) и профиль. Логин затем — на клиенте через
 * signInWithPassword (cookie-сессия). Без localStorage и моков.
 */
export async function registerStorefront(input: {
  name: string;
  phone: string;
  password: string;
  email?: string;
}): Promise<{ error?: string }> {
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 11) return { error: "Укажите корректный номер телефона" };
  if (!input.name.trim()) return { error: "Укажите имя" };
  if (input.password.length < 6) return { error: "Пароль — минимум 6 символов" };

  const db = createSupabaseAdminClient();
  try {
    const created = await db.auth.admin.createUser({
      email: phoneToEmail(input.phone),
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name.trim(), phone: input.phone.trim() },
    });
    if (created.error || !created.data.user) {
      const msg = created.error?.message ?? "";
      if (/already|registered|exists/i.test(msg)) return { error: "Этот номер уже зарегистрирован. Войдите." };
      return { error: msg || "Не удалось создать аккаунт" };
    }
    const { error } = await db.from("profiles").upsert(
      {
        id: created.data.user.id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
      },
      { onConflict: "id" }
    );
    if (error) {
      await db.auth.admin.deleteUser(created.data.user.id);
      return { error: "Не удалось сохранить профиль" };
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка регистрации" };
  }
}
