"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ValidatedPromo } from "@/lib/cart/promo";

export type ValidatePromoResult = { ok?: boolean; error?: string; promo?: ValidatedPromo };

/** Проверяет промокод (активность, даты, лимит) и возвращает его правила. */
export async function validatePromoCode(code: string): Promise<ValidatePromoResult> {
  const c = code.trim().toUpperCase();
  if (!c) return { error: "Введите промокод" };

  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("promo_codes")
    .select("code,discount_type,discount_value,min_order_amount,starts_at,expires_at,total_limit,used_count,is_active,applies_to,applies_to_ids")
    .eq("code", c)
    .maybeSingle();

  if (!data) return { error: "Промокод не найден" };
  if (!data.is_active) return { error: "Промокод неактивен" };

  const now = Date.now();
  if (data.starts_at && new Date(data.starts_at).getTime() > now) return { error: "Промокод ещё не действует" };
  if (data.expires_at && new Date(data.expires_at).getTime() < now) return { error: "Срок действия промокода истёк" };
  if (data.total_limit != null && (data.used_count ?? 0) >= data.total_limit) return { error: "Лимит промокода исчерпан" };

  // Если выбраны родительские категории — раскрываем в дочерние (товары хранят
  // дочерний slug, напр. iphone-15, а админ выбирает «iPhone»).
  let appliesToIds = (data.applies_to_ids ?? []) as string[];
  if (data.applies_to === "categories" && appliesToIds.length) {
    try {
      const { data: cats } = await db.from("categories").select("slug,parent_slug");
      const set = new Set(appliesToIds);
      let changed = true;
      while (changed) {
        changed = false;
        for (const cat of cats ?? []) {
          if (cat.parent_slug && set.has(cat.parent_slug as string) && !set.has(cat.slug as string)) {
            set.add(cat.slug as string);
            changed = true;
          }
        }
      }
      appliesToIds = [...set];
    } catch {
      /* ignore — используем как есть */
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
