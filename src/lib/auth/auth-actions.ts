"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { phoneToEmail } from "@/lib/auth/phone-email";

const CONSENT_VERSION = "2026-01-15-v1";

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
  consentMarketing?: boolean;
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

    // 152-ФЗ: фиксируем согласия, данные при регистрации.
    try {
      let ip: string | null = null;
      let ua: string | null = null;
      try {
        const h = await headers();
        ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
        ua = h.get("user-agent") || null;
      } catch {
        /* ignore */
      }
      const base = {
        user_email: input.email?.trim() || null,
        user_phone: input.phone.replace(/\D/g, "") || null,
        consent_version: CONSENT_VERSION,
        ip_address: ip,
        user_agent: ua,
        source_page: "/auth",
        source_action: "registration",
        given_at: new Date().toISOString(),
      };
      const rows = [
        { ...base, consent_type: "offer_acceptance", consent_purpose: "Принятие оферты и политики конфиденциальности", document_url: "/offer" },
        { ...base, consent_type: "pd_processing", consent_purpose: "Обработка персональных данных для оформления и исполнения заказа", document_url: "/consent" },
        ...(input.consentMarketing
          ? [{ ...base, consent_type: "marketing", consent_purpose: "Получение рекламных и информационных рассылок", document_url: "/consent" }]
          : []),
      ];
      await db.from("data_consents").insert(rows);
    } catch (e) {
      console.error("[registerStorefront] consents:", e);
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка регистрации" };
  }
}
