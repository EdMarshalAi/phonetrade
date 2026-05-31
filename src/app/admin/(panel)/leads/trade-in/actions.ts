"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { getAdminUser } from "@/lib/admin/auth";

const STAFF = ["admin", "manager"] as const;

export async function setTradeInStatus(id: string, status: string, notes?: string): Promise<{ error?: string }> {
  const admin = await getAdminUser();
  try {
    await adminMutation({
      roles: [...STAFF], action: "status_change", entityType: "trade_in_lead", entityId: id,
      changes: { status, notes: notes || null }, revalidate: ["/admin/leads/trade-in", "/account/trade-in"],
      run: async (db) => {
        const { data: cur } = await db.from("trade_in_leads").select("status").eq("id", id).maybeSingle();
        const { error } = await db.from("trade_in_leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        await db.from("trade_in_lead_status_history").insert({ lead_id: id, from_status: cur?.status ?? null, to_status: status, changed_by: admin?.id ?? null, notes: notes || null });
      },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}

export async function setTradeInFinalPrice(id: string, price: number): Promise<{ error?: string }> {
  if (!Number.isFinite(price) || price < 0) return { error: "Некорректная цена" };
  try {
    await adminMutation({
      roles: [...STAFF], action: "update", entityType: "trade_in_lead", entityId: id,
      changes: { final_price_rub: Math.round(price) }, revalidate: ["/admin/leads/trade-in", "/account/trade-in"],
      run: async (db) => { const { error } = await db.from("trade_in_leads").update({ final_price_rub: Math.round(price), updated_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}
