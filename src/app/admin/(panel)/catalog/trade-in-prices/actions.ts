"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { getAdminUser } from "@/lib/admin/auth";

const STAFF = ["admin", "manager"] as const;
const REVALIDATE = ["/admin/catalog/trade-in-prices", "/trade-in"];

export type AddModelInput = {
  model_key: string;
  model_title: string;
  memory_gb: number;
  base_price_rub: number;
  is_active: boolean;
  notes?: string;
};

export type TradeInFormula = {
  external_perfect: number; external_light_wear: number; external_scratches: number; external_glass_crack: number; external_body_crack: number;
  battery_90_100: number; battery_85_89: number; battery_80_84: number; battery_below_80: number;
  broken_none: number; broken_yes: number;
  icloud_unlinked: number;
  kit_full: number; kit_box_only: number; kit_none: number;
  price_rounding: number; rounding_direction: "floor" | "round";
};

export async function updateBasePrice(id: string, price: number): Promise<{ error?: string }> {
  if (!Number.isFinite(price) || price < 0) return { error: "Некорректная цена" };
  const admin = await getAdminUser();
  try {
    await adminMutation({
      roles: [...STAFF], action: "update", entityType: "trade_in_base_price", entityId: id,
      changes: { base_price_rub: Math.round(price) }, revalidate: REVALIDATE,
      run: async (db) => {
        const { error } = await db.from("trade_in_base_prices").update({ base_price_rub: Math.round(price), updated_at: new Date().toISOString(), updated_by: admin?.id ?? null }).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}

export async function toggleBasePriceActive(id: string, active: boolean): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF], action: "update", entityType: "trade_in_base_price", entityId: id,
      changes: { is_active: active }, revalidate: REVALIDATE,
      run: async (db) => {
        const { error } = await db.from("trade_in_base_prices").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}

export async function addBaseModel(input: AddModelInput): Promise<{ error?: string }> {
  if (!input.model_key.trim() || !input.model_title.trim()) return { error: "Укажите модель" };
  if (!input.memory_gb || input.memory_gb <= 0) return { error: "Укажите объём памяти" };
  try {
    await adminMutation({
      roles: [...STAFF], action: "create", entityType: "trade_in_base_price",
      changes: input, revalidate: REVALIDATE,
      run: async (db) => {
        const { data: exists } = await db.from("trade_in_base_prices").select("id").eq("model_key", input.model_key.trim()).eq("memory_gb", input.memory_gb).maybeSingle();
        if (exists) throw new Error("Такая модель с этим объёмом уже есть");
        const { error } = await db.from("trade_in_base_prices").insert({
          model_key: input.model_key.trim(), model_title: input.model_title.trim(), memory_gb: input.memory_gb,
          base_price_rub: Math.round(input.base_price_rub) || 0, is_active: input.is_active, notes: input.notes?.trim() || null,
        });
        if (error) throw error;
      },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}

export async function deleteBasePrices(ids: string[]): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  try {
    await adminMutation({
      roles: [...STAFF], action: "delete", entityType: "trade_in_base_price",
      changes: { ids }, revalidate: REVALIDATE,
      run: async (db) => { const { error } = await db.from("trade_in_base_prices").delete().in("id", ids); if (error) throw error; },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}

export async function bulkSetActive(ids: string[], active: boolean): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  try {
    await adminMutation({
      roles: [...STAFF], action: "bulk_update", entityType: "trade_in_base_price",
      changes: { ids, is_active: active }, revalidate: REVALIDATE,
      run: async (db) => { const { error } = await db.from("trade_in_base_prices").update({ is_active: active, updated_at: new Date().toISOString() }).in("id", ids); if (error) throw error; },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}

export async function bulkAdjustPercent(ids: string[], percent: number): Promise<{ error?: string }> {
  if (ids.length === 0 || !Number.isFinite(percent)) return {};
  try {
    await adminMutation({
      roles: [...STAFF], action: "bulk_update", entityType: "trade_in_base_price",
      changes: { ids, percent }, revalidate: REVALIDATE,
      run: async (db) => {
        const { data } = await db.from("trade_in_base_prices").select("id,base_price_rub").in("id", ids);
        const factor = 1 + percent / 100;
        for (const r of (data ?? []) as { id: string; base_price_rub: number }[]) {
          const next = Math.max(0, Math.round((r.base_price_rub * factor) / 100) * 100);
          await db.from("trade_in_base_prices").update({ base_price_rub: next, updated_at: new Date().toISOString() }).eq("id", r.id);
        }
      },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}

export async function saveTradeInFormula(settings: TradeInFormula): Promise<{ error?: string }> {
  const admin = await getAdminUser();
  try {
    await adminMutation({
      roles: [...STAFF], action: "settings_change", entityType: "trade_in_settings", entityId: "1",
      changes: settings, revalidate: REVALIDATE,
      run: async (db) => {
        const { error } = await db.from("trade_in_settings").update({ ...settings, updated_at: new Date().toISOString(), updated_by: admin?.id ?? null }).eq("id", 1);
        if (error) throw error;
      },
    });
  } catch (e) { return { error: e instanceof Error ? e.message : "Ошибка" }; }
  return {};
}
