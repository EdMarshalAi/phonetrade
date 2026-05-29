"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rowToProduct, type ProductRow } from "@/lib/supabase/types";
import type { Product } from "@/lib/data/products";

/**
 * Избранное хранится в БД (таблица favorites), привязано к пользователю
 * (user_key = нормализованный телефон текущего входа). Без localStorage.
 */

function clean(key: string): string {
  return key.replace(/\D/g, "");
}

export async function getFavoriteIds(userKey: string): Promise<string[]> {
  const key = clean(userKey);
  if (!key) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db.from("favorites").select("product_id").eq("user_key", key).order("added_at", { ascending: false });
  return ((data ?? []) as { product_id: string }[]).map((r) => r.product_id);
}

export async function setFavorite(
  userKey: string,
  productId: string,
  on: boolean
): Promise<{ ids: string[] }> {
  const key = clean(userKey);
  if (!key) return { ids: [] };
  const db = createSupabaseAdminClient();
  if (on) {
    await db.from("favorites").upsert({ user_key: key, product_id: productId }, { onConflict: "user_key,product_id" });
  } else {
    await db.from("favorites").delete().eq("user_key", key).eq("product_id", productId);
  }
  return { ids: await getFavoriteIds(key) };
}

/** Полные товары из избранного — для раздела «Избранное» в кабинете. */
export async function getFavoriteProducts(userKey: string): Promise<Product[]> {
  const ids = await getFavoriteIds(userKey);
  if (ids.length === 0) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("products")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null)
    .eq("status", "published");
  const byId = new Map(((data ?? []) as ProductRow[]).map((p) => [p.id, rowToProduct(p)]));
  // сохраняем порядок добавления (ids — от новых к старым)
  return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
}
