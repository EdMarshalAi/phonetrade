"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTelegram, telegramRecipientsFor } from "@/lib/admin/telegram";
import type { TradeInModel } from "@/lib/trade-in/options";

const CONSENT_VERSION = "2026-01-15-v1";

/** Активные модели для квиза, сгруппированные по модели с вариантами памяти. */
export async function getActiveTradeInModels(): Promise<TradeInModel[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("trade_in_base_prices")
    .select("model_key,model_title,memory_gb,base_price_rub,display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("memory_gb", { ascending: false });

  const map = new Map<string, TradeInModel>();
  for (const r of (data ?? []) as { model_key: string; model_title: string; memory_gb: number; base_price_rub: number }[]) {
    if (!map.has(r.model_key)) map.set(r.model_key, { model_key: r.model_key, model_title: r.model_title, memories: [] });
    map.get(r.model_key)!.memories.push({ memory_gb: r.memory_gb, base_price_rub: r.base_price_rub });
  }
  return [...map.values()];
}

export type QuizInput = {
  modelKey: string;
  modelTitle: string;
  memoryGb: number;
  external: string;
  battery: string;
  hasBreakage: boolean;
  breakageDescription?: string;
  icloud: string;
  kit: string;
  name: string;
  phone: string;
  email?: string;
  consentMarketing?: boolean;
};

export type QuizResult = { ok?: boolean; error?: string; leadNumber?: string; estimatedPrice?: number };

function digits(s: string) { return s.replace(/\D/g, ""); }

export async function submitTradeInQuiz(input: QuizInput): Promise<QuizResult> {
  if (!input.name.trim()) return { error: "Укажите имя" };
  if (digits(input.phone).length < 11) return { error: "Укажите корректный телефон" };
  if (input.icloud === "linked") return { error: "Устройства с привязанным Apple ID не принимаем" };
  if (input.hasBreakage && !input.breakageDescription?.trim()) return { error: "Опишите поломку" };

  const db = createSupabaseAdminClient();

  // Защита от спама: не более 5 заявок с IP за час.
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    ua = h.get("user-agent") || null;
  } catch { /* ignore */ }
  if (ip) {
    try {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await db.from("trade_in_leads").select("id", { count: "exact", head: true }).eq("ip_address", ip).gte("created_at", since);
      if ((count ?? 0) >= 5) return { error: "Слишком много заявок. Попробуйте позже или позвоните нам." };
    } catch { /* ignore */ }
  }

  // Снапшот базовой цены.
  const { data: priceRow } = await db
    .from("trade_in_base_prices")
    .select("base_price_rub")
    .eq("model_key", input.modelKey)
    .eq("memory_gb", input.memoryGb)
    .eq("is_active", true)
    .maybeSingle();
  if (!priceRow) return { error: "Модель недоступна для выкупа" };

  // Расчёт через функцию БД.
  const { data: calc, error: calcErr } = await db.rpc("calculate_trade_in_price", {
    p_model_key: input.modelKey,
    p_memory_gb: input.memoryGb,
    p_external: input.external,
    p_battery: input.battery,
    p_has_breakage: input.hasBreakage,
    p_icloud: input.icloud,
    p_kit: input.kit,
  });
  if (calcErr || !calc || (calc as { error?: string }).error) {
    return { error: "Не удалось рассчитать цену. Попробуйте ещё раз." };
  }
  const result = calc as { final_price: number; coefficients: Record<string, number> };

  const phone = digits(input.phone);
  const email = input.email?.trim() || null;

  // Привязка к клиенту по телефону (если есть).
  let customerId: string | null = null;
  try {
    const { data: c } = await db.from("customers").select("id").eq("phone", phone).maybeSingle();
    customerId = c?.id ?? null;
  } catch { /* ignore */ }

  const { data: lead, error } = await db
    .from("trade_in_leads")
    .insert({
      customer_name: input.name.trim(),
      customer_phone: phone,
      customer_email: email,
      customer_id: customerId,
      model_key: input.modelKey,
      model_title: input.modelTitle,
      memory_gb: input.memoryGb,
      base_price_rub: priceRow.base_price_rub,
      external_condition: input.external,
      battery_level: input.battery,
      has_breakage: input.hasBreakage,
      breakage_description: input.breakageDescription?.trim() || null,
      icloud_status: input.icloud,
      kit_status: input.kit,
      applied_coefficients: result.coefficients,
      estimated_price_rub: result.final_price,
      status: "new",
      source_page: "/trade-in",
      ip_address: ip,
      user_agent: ua,
    })
    .select("lead_number, estimated_price_rub")
    .single();

  if (error || !lead) {
    console.error("[submitTradeInQuiz] insert:", error);
    return { error: "Не удалось создать заявку. Попробуйте ещё раз." };
  }

  // 152-ФЗ: согласия.
  try {
    const base = {
      user_email: email, user_phone: phone, customer_id: customerId,
      consent_version: CONSENT_VERSION, ip_address: ip, user_agent: ua,
      source_page: "/trade-in", source_action: "trade_in_quiz", given_at: new Date().toISOString(),
    };
    const rows = [
      { ...base, consent_type: "offer_acceptance", consent_purpose: "Принятие оферты и политики конфиденциальности", document_url: "/offer" },
      { ...base, consent_type: "pd_processing", consent_purpose: "Обработка персональных данных для заявки trade-in", document_url: "/consent" },
      ...(input.consentMarketing ? [{ ...base, consent_type: "marketing", consent_purpose: "Рекламные рассылки", document_url: "/consent" }] : []),
    ];
    await db.from("data_consents").insert(rows);
  } catch (e) { console.error("[submitTradeInQuiz] consents:", e); }

  // Уведомление (best-effort).
  try {
    const chats = await telegramRecipientsFor("new_lead_trade_in");
    await sendTelegram(
      `🔄 Новая заявка trade-in <b>${lead.lead_number}</b>\n` +
        `Клиент: ${input.name.trim()} ${phone}\n` +
        `Модель: ${input.modelTitle} ${input.memoryGb}GB\n` +
        `Предв. цена: ${new Intl.NumberFormat("ru-RU").format(lead.estimated_price_rub)} ₽` +
        (input.hasBreakage ? `\nПоломка: ${input.breakageDescription?.trim()}` : ""),
      chats.length ? chats : undefined
    );
  } catch { /* ignore */ }

  return { ok: true, leadNumber: lead.lead_number as string, estimatedPrice: lead.estimated_price_rub as number };
}

export type UpsellProduct = { id: string; title: string; image: string; priceCash: number; monthly: number };

/** 3 новинки iPhone дороже цены trade-in (дешёвый / средний / дорогой). */
export async function getUpsellProducts(tradeInPrice: number): Promise<UpsellProduct[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("products")
    .select("id,title,image,price_cash,credit_24m_monthly,category_slug,is_new,status,deleted_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .ilike("category_slug", "iphone%")
    .gt("price_cash", tradeInPrice)
    .order("price_cash", { ascending: true });

  let list = (data ?? []) as { id: string; title: string; image: string | null; price_cash: number; credit_24m_monthly: number | null; is_new: boolean | null }[];
  const news = list.filter((p) => p.is_new);
  if (news.length >= 3) list = news;
  if (list.length === 0) return [];

  let picks = list;
  if (list.length > 3) {
    picks = [list[0], list[Math.floor(list.length / 2)], list[list.length - 1]];
  }
  return picks.map((p) => ({
    id: p.id,
    title: p.title,
    image: p.image ?? "",
    priceCash: p.price_cash,
    monthly: Math.max(0, (p.credit_24m_monthly ?? Math.ceil(p.price_cash / 24)) - Math.round(tradeInPrice / 24)),
  }));
}

export type TradeInLeadView = {
  lead_number: string;
  model_title: string;
  memory_gb: number;
  estimated_price_rub: number;
  status: string;
};

export type MyTradeInLead = {
  lead_number: string;
  model_title: string;
  memory_gb: number;
  estimated_price_rub: number;
  final_price_rub: number | null;
  status: string;
  created_at: string;
};

/** Заявки trade-in пользователя (по телефону) — для личного кабинета. */
export async function getMyTradeInLeads(phone?: string): Promise<MyTradeInLead[]> {
  const ph = phone ? digits(phone) : "";
  if (!ph) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("trade_in_leads")
    .select("lead_number,model_title,memory_gb,estimated_price_rub,final_price_rub,status,created_at")
    .eq("customer_phone", ph)
    .order("created_at", { ascending: false });
  return (data ?? []) as MyTradeInLead[];
}

/** Заявка по номеру — для страницы «Спасибо». */
export async function getTradeInLeadByNumber(leadNumber: string): Promise<TradeInLeadView | null> {
  if (!leadNumber) return null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("trade_in_leads")
    .select("lead_number,model_title,memory_gb,estimated_price_rub,status")
    .eq("lead_number", leadNumber)
    .maybeSingle();
  return (data as TradeInLeadView) ?? null;
}
