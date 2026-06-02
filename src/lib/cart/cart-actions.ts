"use server";

import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToProduct, type ProductRow } from "@/lib/supabase/types";
import { MAX_QTY } from "./constants";
import type { CartItem } from "./types";

const COOKIE = "pt_cart";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 дней

type Db = ReturnType<typeof createSupabaseAdminClient>;

async function readCartId(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}

/** Состав корзины: позиции из cart_items + актуальные товары из products. */
async function itemsFor(db: Db, cartId: string): Promise<CartItem[]> {
  const { data: rows } = await db
    .from("cart_items")
    .select("product_id,qty")
    .eq("cart_id", cartId)
    .order("added_at");
  const lines = (rows ?? []) as { product_id: string; qty: number }[];
  if (lines.length === 0) return [];
  const ids = lines.map((l) => l.product_id);
  const { data: prods } = await db
    .from("products")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null)
    .eq("status", "published");
  const byId = new Map(
    ((prods ?? []) as ProductRow[]).map((p) => [p.id, rowToProduct(p)])
  );
  return lines
    .map((l) => {
      const product = byId.get(l.product_id);
      return product ? { productId: l.product_id, product, qty: l.qty } : null;
    })
    .filter((x): x is CartItem => x !== null);
}

async function ensureCart(db: Db): Promise<string> {
  const c = await cookies();
  const existing = c.get(COOKIE)?.value;
  if (existing) {
    const { data } = await db.from("carts").select("id").eq("id", existing).maybeSingle();
    if (data) return existing as string;
  }
  const { data, error } = await db.from("carts").insert({}).select("id").single();
  if (error) throw error;
  c.set(COOKIE, data.id as string, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return data.id as string;
}

/** Привязывает корзину к залогиненному клиенту (для брошенных корзин). Best-effort. */
async function linkCart(db: Db, cartId: string): Promise<void> {
  try {
    const supa = await createSupabaseServerClient();
    const { data } = await supa.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    const { data: cust } = await db.from("customers").select("id,email").eq("user_id", userId).maybeSingle();
    await db.from("carts").update({ user_id: userId, customer_id: cust?.id ?? null, email: cust?.email ?? null, status: "active" }).eq("id", cartId);
  } catch {
    /* ignore */
  }
}

export async function getCart(): Promise<CartItem[]> {
  const id = await readCartId();
  if (!id) return [];
  return itemsFor(createSupabaseAdminClient(), id);
}

export async function addToCart(productId: string, qty = 1): Promise<CartItem[]> {
  const db = createSupabaseAdminClient();
  const cartId = await ensureCart(db);
  const { data: existing } = await db
    .from("cart_items")
    .select("qty")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();
  const nextQty = Math.min(MAX_QTY, (existing?.qty ?? 0) + Math.max(1, qty));
  const { error } = await db
    .from("cart_items")
    .upsert({ cart_id: cartId, product_id: productId, qty: nextQty }, { onConflict: "cart_id,product_id" });
  if (error) throw error;
  await db.from("carts").update({ updated_at: new Date().toISOString(), status: "active", abandoned_at: null }).eq("id", cartId);
  await linkCart(db, cartId);
  return itemsFor(db, cartId);
}

export async function setCartQty(productId: string, qty: number): Promise<CartItem[]> {
  const db = createSupabaseAdminClient();
  const id = await readCartId();
  if (!id) return [];
  const clamped = Math.max(1, Math.min(MAX_QTY, Math.round(qty) || 1));
  await db.from("cart_items").update({ qty: clamped }).eq("cart_id", id).eq("product_id", productId);
  return itemsFor(db, id);
}

export async function removeFromCart(productId: string): Promise<CartItem[]> {
  const db = createSupabaseAdminClient();
  const id = await readCartId();
  if (!id) return [];
  await db.from("cart_items").delete().eq("cart_id", id).eq("product_id", productId);
  return itemsFor(db, id);
}

export async function clearCart(): Promise<void> {
  const db = createSupabaseAdminClient();
  const id = await readCartId();
  if (!id) return;
  await db.from("cart_items").delete().eq("cart_id", id);
}
