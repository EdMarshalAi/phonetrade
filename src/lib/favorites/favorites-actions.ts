"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorefrontUser } from "@/lib/auth/server-user";
import { rowToProduct, type ProductRow } from "@/lib/supabase/types";
import type { Product } from "@/lib/data/products";

/**
 * Избранное хранится в БД (таблица favorites), привязано к пользователю
 * (user_key = нормализованный телефон). Ключ берётся СТРОГО из серверной
 * cookie-сессии (getStorefrontUser), а НЕ из аргумента с клиента — иначе IDOR:
 * любой мог бы читать/менять чужое избранное по чужому телефону. Параметр
 * userKey сохранён для обратной совместимости вызовов, но игнорируется.
 */

async function sessionKey(): Promise<string> {
  const user = await getStorefrontUser();
  return user?.phone ? user.phone.replace(/\D/g, "") : "";
}

async function idsForKey(db: ReturnType<typeof createSupabaseAdminClient>, key: string): Promise<string[]> {
  const { data } = await db.from("favorites").select("product_id").eq("user_key", key).order("added_at", { ascending: false });
  return ((data ?? []) as { product_id: string }[]).map((r) => r.product_id);
}

export async function getFavoriteIds(_userKey?: string): Promise<string[]> {
  const key = await sessionKey();
  if (!key) return [];
  return idsForKey(createSupabaseAdminClient(), key);
}

export async function setFavorite(
  _userKey: string,
  productId: string,
  on: boolean
): Promise<{ ids: string[] }> {
  const key = await sessionKey();
  if (!key) return { ids: [] };
  const db = createSupabaseAdminClient();
  if (on) {
    await db.from("favorites").upsert({ user_key: key, product_id: productId }, { onConflict: "user_key,product_id" });
  } else {
    await db.from("favorites").delete().eq("user_key", key).eq("product_id", productId);
  }
  return { ids: await idsForKey(db, key) };
}

/** Полные товары из избранного — для раздела «Избранное» в кабинете. */
export async function getFavoriteProducts(_userKey?: string): Promise<Product[]> {
  const key = await sessionKey();
  if (!key) return [];
  const db = createSupabaseAdminClient();
  const ids = await idsForKey(db, key);
  if (ids.length === 0) return [];
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
