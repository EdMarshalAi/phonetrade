"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Текущий клиент по сессии (customers.user_id = auth user). */
async function resolveCustomer(): Promise<{ id: string; phone: string | null; email: string | null } | null> {
  try {
    const supa = await createSupabaseServerClient();
    const { data } = await supa.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return null;
    const db = createSupabaseAdminClient();
    const { data: cust } = await db.from("customers").select("id,phone,email").eq("user_id", userId).maybeSingle();
    return cust ? { id: cust.id as string, phone: (cust.phone as string) ?? null, email: (cust.email as string) ?? null } : null;
  } catch {
    return null;
  }
}

async function grant(db: ReturnType<typeof createSupabaseAdminClient>, cust: { id: string; phone: string | null; email: string | null }, type: string, purpose: string) {
  const { data: ex } = await db.from("data_consents").select("id").eq("customer_id", cust.id).eq("consent_type", type).is("revoked_at", null).limit(1);
  if (ex?.length) return;
  await db.from("data_consents").insert({
    customer_id: cust.id, user_phone: cust.phone ? cust.phone.replace(/\D/g, "") : null, user_email: cust.email ?? null,
    consent_type: type, consent_purpose: purpose, document_url: "/consent",
    source_page: "/account/email-preferences", source_action: "preferences", given_at: new Date().toISOString(),
  });
}
async function revoke(db: ReturnType<typeof createSupabaseAdminClient>, customerId: string, type: string) {
  await db.from("data_consents").update({ revoked_at: new Date().toISOString() }).eq("customer_id", customerId).eq("consent_type", type).is("revoked_at", null);
}

/** Маркетинговые рассылки вкл/выкл. */
export async function setMarketing(on: boolean): Promise<{ ok?: boolean; error?: string }> {
  const cust = await resolveCustomer();
  if (!cust) return { error: "Войдите, чтобы изменить настройки" };
  const db = createSupabaseAdminClient();
  if (on) await grant(db, cust, "marketing", "Получение рекламных и информационных рассылок");
  else await revoke(db, cust.id, "marketing");
  return { ok: true };
}

/** Сервисные напоминания вкл/выкл (off = active service_optout). */
export async function setService(on: boolean): Promise<{ ok?: boolean; error?: string }> {
  const cust = await resolveCustomer();
  if (!cust) return { error: "Войдите, чтобы изменить настройки" };
  const db = createSupabaseAdminClient();
  if (on) await revoke(db, cust.id, "service_optout");
  else await grant(db, cust, "service_optout", "Отказ от сервисных писем");
  return { ok: true };
}

/** Полная отписка: маркетинг выкл + сервисные выкл. Транзакционные остаются. */
export async function fullUnsubscribe(): Promise<{ ok?: boolean; error?: string }> {
  const cust = await resolveCustomer();
  if (!cust) return { error: "Войдите, чтобы изменить настройки" };
  const db = createSupabaseAdminClient();
  await revoke(db, cust.id, "marketing");
  await grant(db, cust, "service_optout", "Полная отписка от писем");
  return { ok: true };
}
