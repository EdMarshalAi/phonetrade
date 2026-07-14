"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ValidatedPromo } from "@/lib/cart/promo";

export type ValidatePromoResult = { ok?: boolean; error?: string; promo?: ValidatedPromo };

export type PromoCustomerContext = {
  customerId?: string | null;
  email?: string | null;
  hasPriorOrders: boolean;
};

/** Проверяет промокод (активность, даты, лимит) и возвращает его правила. */
export async function validatePromoCode(
  code: string,
  customer?: PromoCustomerContext
): Promise<ValidatePromoResult> {
  const c = code.trim().toUpperCase();
  if (!c) return { error: "Введите промокод" };
  if (c.length > 64) return { error: "Некорректный промокод" };

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("promo_codes")
    .select("id,code,discount_type,discount_value,min_order_amount,starts_at,expires_at,total_limit,per_customer_limit,used_count,only_new_customers,is_active,applies_to,applies_to_ids")
    .eq("code", c)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { error: "Не удалось проверить промокод. Попробуйте ещё раз." };
  if (!data) return { error: "Промокод не найден" };
  if (!data.is_active) return { error: "Промокод неактивен" };

  const now = Date.now();
  if (data.starts_at && new Date(data.starts_at).getTime() > now) return { error: "Промокод ещё не действует" };
  if (data.expires_at && new Date(data.expires_at).getTime() < now) return { error: "Срок действия промокода истёк" };
  if (data.total_limit != null && (data.used_count ?? 0) >= data.total_limit) return { error: "Лимит промокода исчерпан" };
  if (customer?.hasPriorOrders && data.only_new_customers) {
    return { error: "Промокод действует только для первого заказа" };
  }

  if (customer && data.per_customer_limit != null && data.per_customer_limit > 0) {
    let usageQuery = db
      .from("promo_code_usages")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", data.id);
    if (customer.customerId) {
      usageQuery = usageQuery.eq("customer_id", customer.customerId);
    } else if (customer.email?.trim()) {
      usageQuery = usageQuery.ilike("customer_email_snapshot", customer.email.trim());
    } else {
      usageQuery = usageQuery.is("customer_id", null).eq("customer_email_snapshot", "");
    }
    const { count, error: usageError } = await usageQuery;
    if (usageError) return { error: "Не удалось проверить лимит промокода. Попробуйте ещё раз." };
    if ((count ?? 0) >= data.per_customer_limit) {
      return { error: "Лимит использований промокода для этого покупателя исчерпан" };
    }
  }

  // Если выбраны родительские категории — раскрываем в дочерние (товары хранят
  // дочерний slug, напр. iphone-15, а админ выбирает «iPhone»).
  let appliesToIds = (data.applies_to_ids ?? []) as string[];
  if (data.applies_to === "categories" && appliesToIds.length) {
    try {
      const { data: cats, error: categoriesError } = await db
        .from("categories")
        .select("slug,parent_slug")
        .eq("is_published", true);
      if (categoriesError || !cats) {
        return { error: "Не удалось проверить область действия промокода. Попробуйте ещё раз." };
      }
      const set = new Set(appliesToIds);
      let changed = true;
      while (changed) {
        changed = false;
        for (const cat of cats) {
          if (cat.parent_slug && set.has(cat.parent_slug as string) && !set.has(cat.slug as string)) {
            set.add(cat.slug as string);
            changed = true;
          }
        }
      }
      appliesToIds = [...set];
    } catch {
      return { error: "Не удалось проверить область действия промокода. Попробуйте ещё раз." };
    }
  }

  return {
    ok: true,
    promo: {
      code: c,
      discountType: (data.discount_type ?? "percent") as ValidatedPromo["discountType"],
      discountValue: data.discount_value ?? 0,
      minOrderAmount: data.min_order_amount ?? 0,
      appliesTo: (data.applies_to ?? "all") as ValidatedPromo["appliesTo"],
      appliesToIds,
    },
  };
}
