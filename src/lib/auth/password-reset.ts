"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/admin/mailer";
import { passwordResetEmail } from "@/lib/email/templates";
import { clientIp, rateLimited } from "@/lib/utils/rate-limit";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TTL_MS = 60 * 60 * 1000; // 1 час

type Audience = "storefront" | "admin";

function newToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

/**
 * Запрос сброса пароля. Ищет пользователя по email (profiles для витрины,
 * admin_users для админки), создаёт токен и шлёт письмо со ссылкой. ВСЕГДА
 * возвращает ok (не раскрываем, существует ли аккаунт — защита от перебора).
 */
export async function requestPasswordReset(
  email: string,
  audience: Audience
): Promise<{ ok: boolean; error?: string }> {
  const e = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, error: "Укажите корректный e-mail" };

  // Антиспам: не более 5 запросов с IP за 15 минут.
  if (rateLimited(`pwreset:${await clientIp()}`, 5, 900_000)) {
    return { ok: false, error: "Слишком много запросов. Попробуйте позже." };
  }

  try {
    const db = createSupabaseAdminClient();
    let userId: string | null = null;
    let name: string | null = null;

    if (audience === "admin") {
      const { data } = await db
        .from("admin_users")
        .select("id,full_name,email")
        .ilike("email", e)
        .eq("is_active", true)
        .maybeSingle();
      userId = data?.id ?? null;
      name = data?.full_name ?? null;
    } else {
      const { data } = await db
        .from("profiles")
        .select("id,name,email")
        .ilike("email", e)
        .maybeSingle();
      userId = data?.id ?? null;
      name = data?.name ?? null;
    }

    // Аккаунт найден — создаём токен и шлём письмо. Если нет — молча выходим ok.
    if (userId) {
      const token = newToken();
      const expires = new Date(Date.now() + TTL_MS).toISOString();
      await db.from("password_reset_tokens").insert({ token, user_id: userId, audience, email: e, expires_at: expires });
      const path = audience === "admin" ? "/admin/reset" : "/auth/reset";
      const link = `${SITE_URL}${path}?token=${token}`;
      const mail = passwordResetEmail({ name: name ?? undefined, link, isAdmin: audience === "admin" });
      await sendMail({ to: e, subject: mail.subject, html: mail.html, text: mail.text });
    }
    return { ok: true };
  } catch (err) {
    console.error("[requestPasswordReset]", err);
    // Не раскрываем детали наружу.
    return { ok: true };
  }
}

/**
 * Установить новый пароль по токену. Проверяет, что токен есть, не использован
 * и не истёк, меняет пароль через admin.updateUserById и помечает токен
 * использованным. Возвращает audience для корректного редиректа на вход.
 */
export async function resetPassword(
  token: string,
  password: string
): Promise<{ ok?: boolean; audience?: Audience; error?: string }> {
  const t = (token || "").trim();
  if (!t) return { error: "Ссылка недействительна" };
  if (!password || password.length < 6) return { error: "Пароль — минимум 6 символов" };

  try {
    const db = createSupabaseAdminClient();
    const { data: row } = await db
      .from("password_reset_tokens")
      .select("token,user_id,audience,used_at,expires_at")
      .eq("token", t)
      .maybeSingle();

    if (!row) return { error: "Ссылка недействительна" };
    if (row.used_at) return { error: "Ссылка уже использована. Запросите новую." };
    if (new Date(row.expires_at).getTime() < Date.now()) return { error: "Срок действия ссылки истёк. Запросите новую." };

    const upd = await db.auth.admin.updateUserById(row.user_id, { password });
    if (upd.error) return { error: "Не удалось обновить пароль. Попробуйте ещё раз." };

    await db.from("password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("token", t);
    return { ok: true, audience: row.audience as Audience };
  } catch (err) {
    console.error("[resetPassword]", err);
    return { error: "Произошла ошибка. Попробуйте ещё раз." };
  }
}
