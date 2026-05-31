"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { promoSchema, type PromoInput } from "@/lib/admin/schemas";

const STAFF = ["admin", "manager"] as const;

function normalize(input: PromoInput) {
  return {
    code: input.code,
    discount_type: input.discount_type,
    discount_value: input.discount_value ?? 0,
    min_order_amount: input.min_order_amount ?? 0,
    starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null,
    expires_at: input.expires_at ? new Date(input.expires_at).toISOString() : null,
    total_limit: input.total_limit ?? null,
    per_customer_limit: input.per_customer_limit ?? null,
    only_new_customers: input.only_new_customers ?? false,
    is_active: input.is_active ?? true,
    applies_to: input.applies_to ?? "all",
    applies_to_ids: (input.applies_to ?? "all") === "all" ? [] : input.applies_to_ids ?? [],
  };
}

function friendly(m: string): string {
  return m.includes("duplicate") || m.includes("unique") ? "Такой промокод уже существует" : m;
}

export async function createPromo(input: PromoInput): Promise<{ error?: string }> {
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "promo_code",
      entityId: parsed.data.code,
      changes: parsed.data,
      run: async (db) => {
        const { error } = await db.from("promo_codes").insert(normalize(parsed.data));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/promotions/promo-codes");
}

export async function updatePromo(id: string, input: PromoInput): Promise<{ error?: string }> {
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "promo_code",
      entityId: id,
      changes: parsed.data,
      run: async (db) => {
        const { error } = await db.from("promo_codes").update(normalize(parsed.data)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/promotions/promo-codes");
}

export async function deletePromo(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "promo_code",
      entityId: id,
      run: async (db) => {
        const { error } = await db.from("promo_codes").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
