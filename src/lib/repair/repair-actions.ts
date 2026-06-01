"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyTelegram } from "@/lib/admin/telegram";
import { issueLabel } from "@/lib/repair/devices";

const CONSENT_VERSION = "2026-01-15-v1";
const digits = (s: string) => s.replace(/\D/g, "");

export type RepairInput = {
  device: string;        // напр. "iPhone 13 Pro" или свободный ввод
  category: string;      // iphone | ipad | mac | other
  issues: string[];      // ключи REPAIR_ISSUES
  comment?: string;
  name: string;
  phone: string;
  email?: string;
  consentMarketing?: boolean;
};

export type RepairResult = { ok?: boolean; error?: string };

export async function submitRepairRequest(input: RepairInput): Promise<RepairResult> {
  if (!input.device?.trim()) return { error: "Выберите устройство" };
  if (!input.name.trim()) return { error: "Укажите имя" };
  if (digits(input.phone).length < 11) return { error: "Укажите корректный телефон" };
  if (!input.issues.length && !input.comment?.trim()) return { error: "Выберите, что нужно починить" };

  const db = createSupabaseAdminClient();

  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    ua = h.get("user-agent") || null;
  } catch { /* ignore */ }

  // Антиспам: не более 5 заявок-ремонтов с IP за час.
  if (ip) {
    try {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await db.from("leads").select("id", { count: "exact", head: true }).eq("type", "repair").eq("ip_address", ip).gte("created_at", since);
      if ((count ?? 0) >= 5) return { error: "Слишком много заявок. Позвоните нам или попробуйте позже." };
    } catch { /* ignore */ }
  }

  const phone = digits(input.phone);
  const email = input.email?.trim() || null;
  const issuesText = input.issues.map(issueLabel).join(", ") || "—";

  // Единый реестр клиентов.
  let customerId: string | null = null;
  try {
    const { data: cid } = await db.rpc("upsert_customer", { p_phone: input.phone, p_name: input.name.trim(), p_email: email });
    customerId = typeof cid === "string" ? cid : null;
  } catch { /* ignore */ }

  let leadId: string | null = null;
  try {
    const { data: leadRow, error } = await db.from("leads").insert({
      type: "repair",
      contact_name: input.name.trim(),
      contact_phone: phone,
      contact_email: email,
      customer_id: customerId,
      status: "new",
      source_url: "/repair",
      ip_address: ip,
      user_agent: ua,
      payload: {
        device: input.device.trim(),
        category: input.category,
        issues: input.issues,
        issues_text: issuesText,
        comment: input.comment?.trim() || null,
      },
    }).select("id").single();
    if (error) throw error;
    leadId = (leadRow?.id as string) ?? null;
  } catch (e) {
    console.error("[submitRepairRequest] lead insert:", e);
    return { error: "Не удалось создать заявку. Попробуйте ещё раз." };
  }

  // 152-ФЗ: согласия.
  try {
    const base = {
      user_email: email, user_phone: phone, customer_id: customerId,
      consent_version: CONSENT_VERSION, ip_address: ip, user_agent: ua,
      source_page: "/repair", source_action: "repair_request", given_at: new Date().toISOString(),
    };
    const rows = [
      { ...base, consent_type: "offer_acceptance", consent_purpose: "Принятие оферты и политики конфиденциальности", document_url: "/offer" },
      { ...base, consent_type: "pd_processing", consent_purpose: "Обработка персональных данных для заявки на ремонт", document_url: "/consent" },
      ...(input.consentMarketing ? [{ ...base, consent_type: "marketing", consent_purpose: "Рекламные рассылки", document_url: "/consent" }] : []),
    ];
    await db.from("data_consents").insert(rows);
  } catch (e) { console.error("[submitRepairRequest] consents:", e); }

  // Уведомление в Telegram (best-effort).
  try {
    const adminBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
    const link = leadId ? `${adminBase}/admin/leads/${leadId}` : `${adminBase}/admin/leads`;
    await notifyTelegram(
      "new_lead_repair",
      `🛠 <b>Заявка на ремонт</b>\n\n` +
        `👤 ${input.name.trim()}\n` +
        `📞 ${phone}\n` +
        (email ? `✉️ ${email}\n` : "") +
        `\n📱 ${input.device.trim()}\n` +
        `Что чинить: ${issuesText}\n` +
        (input.comment?.trim() ? `Комментарий: ${input.comment.trim()}\n` : "") +
        `\n🔗 ${link}`
    );
  } catch { /* ignore */ }

  return { ok: true };
}
