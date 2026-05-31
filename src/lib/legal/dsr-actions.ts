"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTelegram, telegramRecipientsFor } from "@/lib/admin/telegram";
import { DSR_TYPES, type DsrType } from "@/lib/legal/dsr";

export type SubmitDataRequestInput = {
  requestType: DsrType;
  name?: string;
  email?: string;
  phone?: string;
  details?: string;
};

export type SubmitDataRequestResult = { ok?: boolean; error?: string };

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
  try {
    // Привязываем к клиенту по телефону (если есть в базе).
    let customerId: string | null = null;
    if (phone) {
      const { data: c } = await db.from("customers").select("id").eq("phone", phone).maybeSingle();
      customerId = c?.id ?? null;
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
  } catch (e) {
    console.error("[submitDataRequest] error:", e);
    return { error: "Не удалось отправить обращение. Попробуйте ещё раз." };
  }

  // Уведомление в Telegram (best-effort).
  try {
    const chats = await telegramRecipientsFor("data_request_new");
    await sendTelegram(
      `🔐 Новое обращение по персональным данным\n` +
        `Тип: <b>${DSR_TYPES[input.requestType]}</b>\n` +
        `Контакт: ${email || phone || "—"}\n` +
        `Срок ответа: 30 дней (152-ФЗ).`,
      chats.length ? chats : undefined
    );
  } catch {
    /* ignore */
  }

  return { ok: true };
}
