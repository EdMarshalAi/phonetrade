"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { phoneToEmail } from "@/lib/auth/phone-email";
import { notifyTelegram } from "@/lib/admin/telegram";
import { sendMail } from "@/lib/admin/mailer";
import { welcomeEmail } from "@/lib/email/templates";

const CONSENT_VERSION = "2026-01-15-v1";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Телефон → email аккаунта для входа. Большинство покупателей входят по
 * синтетическому email ({digits}@phonetrade.local), но у единого аккаунта
 * (владелец, он же админ) реальный email (owner@phonetrade.ru). Функция
 * resolve_login_email ищет аккаунт по последним 10 цифрам телефона (8/+7/без
 * кода — без разницы). Фолбэк — синтетический email.
 */
export async function resolveLoginEmail(phone: string): Promise<string> {
  const fallback = phoneToEmail(phone);
  if (phone.replace(/\D/g, "").length < 10) return fallback;
  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db.rpc("resolve_login_email", { p: phone });
    if (error) return fallback;
    return typeof data === "string" && data ? data : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Обновление профиля текущего покупателя. Пользователь определяется по
 * cookie-сессии (server), запись — через service-role клиент (надёжно, без
 * зависимости от RLS на анонимном клиенте). Возвращает ошибку, если не сохранилось.
 */
export async function updateStorefrontProfile(patch: {
  name?: string; phone?: string; email?: string; address?: string;
}): Promise<{ error?: string }> {
  let userId: string | null = null;
  try {
    const supa = await createSupabaseServerClient();
    const { data } = await supa.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    return { error: "Сессия не найдена" };
  }
  if (!userId) return { error: "Войдите, чтобы сохранить профиль" };

  const row: Record<string, string | null> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.phone !== undefined) row.phone = patch.phone.trim();
  if (patch.email !== undefined) row.email = patch.email.trim() || null;
  if (patch.address !== undefined) row.address = patch.address.trim() || null;
  if (Object.keys(row).length === 0) return {};

  try {
    const db = createSupabaseAdminClient();
    const { error } = await db.from("profiles").update(row).eq("id", userId);
    if (error) return { error: "Не удалось сохранить профиль" };
    // Синхронизируем единый реестр «Клиенты» (по телефону, связь user_id).
    try {
      const { data: prof } = await db.from("profiles").select("name, phone, email").eq("id", userId).maybeSingle();
      if (prof?.phone) {
        await db.rpc("upsert_customer", { p_phone: prof.phone, p_name: prof.name || null, p_email: prof.email || null, p_user_id: userId });
      }
    } catch (e) {
      console.error("[updateStorefrontProfile] upsert_customer:", e);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  return {};
}

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
  // Email обязателен — нужен для восстановления пароля и писем покупателю.
  const emailTrim = input.email?.trim() || "";
  if (!emailTrim || !EMAIL_RE.test(emailTrim)) return { error: "Укажите корректный e-mail" };
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

    // Единый реестр «Клиенты»: регистрация = клиент (связь по user_id).
    let customerId: string | null = null;
    try {
      const { data: cid } = await db.rpc("upsert_customer", {
        p_phone: input.phone,
        p_name: input.name.trim(),
        p_email: input.email?.trim() || null,
        p_user_id: created.data.user.id,
      });
      customerId = typeof cid === "string" ? cid : null;
    } catch (e) {
      console.error("[registerStorefront] upsert_customer:", e);
    }

    // Welcome-серия: 2-е и 3-е письма откладываем в очередь (+2д / +5д). 1-е
    // шлём синхронно ниже. Шлются только при согласии на маркетинг (проверяет
    // процессор очереди). dedup_key — чтобы не задвоить при повторной отправке.
    try {
      const { enqueueTrigger } = await import("@/lib/email/queue");
      const firstName = input.name.trim().split(/\s+/)[0] || "";
      const vars = { customer: { first_name: firstName, name: input.name.trim() } };
      const now = Date.now();
      await enqueueTrigger({ triggerSlug: "welcome_2", customerId, recipientEmail: emailTrim, variables: vars, scheduledAt: new Date(now + 2 * 86400_000), dedupKey: `welcome:${created.data.user.id}:2` });
      await enqueueTrigger({ triggerSlug: "welcome_3", customerId, recipientEmail: emailTrim, variables: vars, scheduledAt: new Date(now + 5 * 86400_000), dedupKey: `welcome:${created.data.user.id}:3` });
    } catch (e) {
      console.error("[registerStorefront] welcome queue:", e);
    }

    // Уведомление в Telegram/Email о новой регистрации (best-effort, не роняет регистрацию).
    try {
      const emailLine = input.email?.trim() ? `\n✉️ ${input.email.trim()}` : "";
      await notifyTelegram(
        "new_registration",
        `🙋 Новая регистрация на сайте\n👤 ${input.name.trim()}\n📞 ${input.phone.trim()}${emailLine}`
      );
    } catch (e) {
      console.error("[registerStorefront] notify:", e);
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
        customer_id: customerId, // линкуем согласие к клиенту (нужно для сегментов рассылок)
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

    // Приветственное письмо покупателю (best-effort, не роняет регистрацию).
    try {
      const w = welcomeEmail(input.name.trim());
      await sendMail({ to: emailTrim, subject: w.subject, html: w.html, text: w.text });
    } catch (e) {
      console.error("[registerStorefront] welcome email:", e);
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка регистрации" };
  }
}
