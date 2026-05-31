"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyTelegram } from "@/lib/admin/telegram";
import { DSR_TYPES, type DsrType } from "@/lib/legal/dsr";

export type SubmitDataRequestInput = {
  requestType: DsrType;
  name?: string;
  email?: string;
  phone?: string;
  details?: string;
};

export type SubmitDataRequestResult = { ok?: boolean; error?: string };

export type MyConsent = {
  consent_type: string;
  consent_purpose: string | null;
  given_at: string | null;
  source_action: string | null;
};

/** Активные согласия пользователя (по телефону/email) для личного кабинета. */
export async function getMyConsents(phone?: string, email?: string): Promise<MyConsent[]> {
  const ph = phone ? phone.replace(/\D/g, "") : "";
  const em = email?.trim() || "";
  if (!ph && !em) return [];
  const db = createSupabaseAdminClient();
  try {
    const ors: string[] = [];
    if (ph) ors.push(`user_phone.eq.${ph}`);
    if (em) ors.push(`user_email.eq.${em}`);
    const { data } = await db
      .from("data_consents")
      .select("consent_type,consent_purpose,given_at,source_action,revoked_at")
      .or(ors.join(","))
      .is("revoked_at", null)
      .order("given_at", { ascending: false });
    const rows = (data ?? []) as (MyConsent & { revoked_at: string | null })[];
    // Последнее активное согласие по каждому типу.
    const seen = new Set<string>();
    const out: MyConsent[] = [];
    for (const r of rows) {
      if (seen.has(r.consent_type)) continue;
      seen.add(r.consent_type);
      out.push({ consent_type: r.consent_type, consent_purpose: r.consent_purpose, given_at: r.given_at, source_action: r.source_action });
    }
    return out;
  } catch {
    return [];
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Приём обращения субъекта ПД с сайта (кабинет «Конфиденциальность»).
 * Пишет в data_subject_requests (срок ответа — 30 дней, дефолт в БД),
 * шлёт уведомление в Telegram. Best-effort, никогда не роняет страницу.
 */
export async function submitDataRequest(
  input: SubmitDataRequestInput
): Promise<SubmitDataRequestResult> {
  if (!input.requestType || !(input.requestType in DSR_TYPES)) {
    return { error: "Выберите тип обращения" };
  }
  const email = input.email?.trim() || null;
  const phone = input.phone ? normalizePhone(input.phone) || null : null;
  if (!email && !phone) {
    return { error: "Укажите телефон или email для связи" };
  }

  const db = createSupabaseAdminClient();
  let leadId: string | null = null;
  try {
    // Единый реестр «Клиенты»: создаём по телефону, если ещё нет.
    let customerId: string | null = null;
    if (phone) {
      try {
        const { data: cid } = await db.rpc("upsert_customer", {
          p_phone: phone, p_name: input.name?.trim() || null, p_email: email || null,
        });
        customerId = (typeof cid === "string" ? cid : null);
      } catch { /* ignore */ }
    }

    // Метаданные обращения добавляем в текст (для аудита).
    let meta = "";
    try {
      const h = await headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "—";
      meta = `\n\n— IP: ${ip}`;
    } catch {
      /* ignore */
    }
    const details = [
      input.name ? `Имя: ${input.name}` : null,
      input.details?.trim() ? input.details.trim() : null,
    ]
      .filter(Boolean)
      .join("\n") + meta;

    const { error } = await db.from("data_subject_requests").insert({
      request_type: input.requestType,
      user_email: email,
      user_phone: phone,
      customer_id: customerId,
      status: "new",
      request_details: details || null,
    });
    if (error) {
      console.error("[submitDataRequest] insert error:", error);
      return { error: "Не удалось отправить обращение. Попробуйте ещё раз." };
    }

    // Дублируем как заявку в общий инбокс /admin/leads (тип «Запрос по данным»).
    try {
      const { data: leadRow } = await db.from("leads").insert({
        type: "data_request",
        contact_name: input.name?.trim() || null,
        contact_phone: phone,
        contact_email: email,
        customer_id: customerId,
        status: "new",
        source_url: "/account/privacy",
        payload: {
          request_type: input.requestType,
          request_label: DSR_TYPES[input.requestType],
          details: input.details?.trim() || null,
        },
      }).select("id").single();
      leadId = (leadRow?.id as string) ?? null;
    } catch (e) {
      console.error("[submitDataRequest] lead insert:", e);
    }
  } catch (e) {
    console.error("[submitDataRequest] error:", e);
    return { error: "Не удалось отправить обращение. Попробуйте ещё раз." };
  }

  // Уведомление в Telegram (best-effort).
  try {
    const adminBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
    const link = leadId ? `${adminBase}/admin/leads/${leadId}` : `${adminBase}/admin/leads`;
    await notifyTelegram(
      "data_request_new",
      `🔐 <b>Обращение по персональным данным</b>\n\n` +
        `Тип: ${DSR_TYPES[input.requestType]}\n` +
        (input.name?.trim() ? `👤 ${input.name.trim()}\n` : "") +
        `📞 ${phone || "—"}\n` +
        `✉️ ${email || "—"}\n` +
        (input.details?.trim() ? `\nКомментарий: ${input.details.trim()}\n` : "") +
        `\n⏱ Срок ответа: 30 дней (152-ФЗ)\n` +
        `\n🔗 ${link}`
    );
  } catch {
    /* ignore */
  }

  return { ok: true };
}
