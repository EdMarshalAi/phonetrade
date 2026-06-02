"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Отписка от маркетинга по customer_id из ссылки письма. Идемпотентно:
 * проставляет revoked_at у активного marketing-согласия и отменяет
 * запланированные маркетинговые письма этому клиенту. Возвращает имя для
 * приветствия (если нашли).
 */
export async function unsubscribeByCustomer(customerId: string): Promise<{ ok: boolean; name?: string | null }> {
  const c = (customerId || "").trim();
  if (!c) return { ok: false };
  try {
    const db = createSupabaseAdminClient();
    await db.from("data_consents").update({ revoked_at: new Date().toISOString() }).eq("customer_id", c).eq("consent_type", "marketing").is("revoked_at", null);
    // Снимаем будущие маркетинговые письма из очереди.
    await db.from("email_queue").update({ status: "cancelled", failure_reason: "unsubscribed" }).eq("customer_id", c).eq("status", "pending");
    const { data: cust } = await db.from("customers").select("name").eq("id", c).maybeSingle();
    return { ok: true, name: cust?.name ?? null };
  } catch {
    return { ok: false };
  }
}

/** Повторная подписка: новое активное marketing-согласие. */
export async function resubscribeByCustomer(customerId: string): Promise<{ ok: boolean }> {
  const c = (customerId || "").trim();
  if (!c) return { ok: false };
  try {
    const db = createSupabaseAdminClient();
    const { data: cust } = await db.from("customers").select("phone,email").eq("id", c).maybeSingle();
    await db.from("data_consents").insert({
      customer_id: c,
      user_phone: cust?.phone ? cust.phone.replace(/\D/g, "") : null,
      user_email: cust?.email ?? null,
      consent_type: "marketing",
      consent_purpose: "Получение рекламных и информационных рассылок",
      document_url: "/consent",
      source_page: "/unsubscribe",
      source_action: "resubscribe",
      given_at: new Date().toISOString(),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
