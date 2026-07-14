"use server";

import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToProduct, type ProductRow } from "@/lib/supabase/types";
import { MAX_ORDER_LINES, MAX_QTY } from "./constants";
import type { CartItem } from "./types";

const COOKIE = "pt_cart";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 дней

type Db = ReturnType<typeof createSupabaseAdminClient>;
const CART_PRODUCT_SELECT = "id,title,category_slug,model,color,memory,sim,image,gallery,price_cash,price_card,price_old,installment_from,installment_partner,badge,badges,options,condition,condition_text,battery,is_used,is_new,in_stock,stock,is_available,sku,brand";

async function readCartId(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}

/** Состав корзины: позиции из cart_items + актуальные товары из products. */
async function itemsFor(db: Db, cartId: string): Promise<CartItem[]> {
  const { data: rows, error: rowsError } = await db
    .from("cart_items")
    .select("product_id,qty")
    .eq("cart_id", cartId)
    .order("added_at");
  if (rowsError) throw rowsError;
  const lines = (rows ?? []) as { product_id: string; qty: number }[];
  if (lines.length === 0) return [];
  const ids = lines.map((l) => l.product_id);
  const { data: prods, error: productsError } = await db
    .from("products")
    .select(CART_PRODUCT_SELECT)
    .in("id", ids)
    .is("deleted_at", null)
    .eq("status", "published");
  if (productsError) throw productsError;
  if (!prods) throw new Error("Не удалось обновить товары корзины");
  const byId = new Map(
    (prods as unknown as ProductRow[]).map((p) => [p.id, rowToProduct(p)])
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
  const normalizedProductId = productId.trim();
  if (!normalizedProductId || normalizedProductId.length > 200) throw new Error("Некорректный товар");
  const db = createSupabaseAdminClient();
  const cartId = await ensureCart(db);
  const [
    { data: existing, error: existingError },
    { count: lineCount, error: countError },
    { data: product, error: productError },
    { data: availability, error: availabilityError },
  ] = await Promise.all([
    db.from("cart_items").select("qty").eq("cart_id", cartId).eq("product_id", normalizedProductId).maybeSingle(),
    db.from("cart_items").select("product_id", { count: "exact", head: true }).eq("cart_id", cartId),
    db.from("products").select("id,stock,in_stock,is_available").eq("id", normalizedProductId).eq("status", "published").is("deleted_at", null).maybeSingle(),
    db.from("shop_settings").select("value").eq("key", "product_availability").maybeSingle(),
  ]);
  if (existingError || countError || productError || availabilityError) {
    throw existingError ?? countError ?? productError ?? availabilityError;
  }
  if (!product || product.is_available === false) throw new Error("Товар больше недоступен");
  if (!availability) throw new Error("Не удалось проверить наличие товара");
  const allowZeroStock = ((availability?.value ?? {}) as { allow_zero_stock?: boolean }).allow_zero_stock !== false;
  if (!allowZeroStock && ((product.stock != null && product.stock <= 0) || (product.stock == null && product.in_stock === false))) {
    throw new Error("Товар закончился");
  }
  if (!existing && (lineCount ?? 0) >= MAX_ORDER_LINES) {
    throw new Error(`В корзине может быть не больше ${MAX_ORDER_LINES} позиций`);
  }
  const requestedQty = Math.max(1, Math.min(MAX_QTY, Math.round(Number(qty)) || 1));
  const stockLimit = !allowZeroStock && product.stock != null ? Math.max(1, product.stock) : MAX_QTY;
  const nextQty = Math.min(MAX_QTY, stockLimit, (existing?.qty ?? 0) + requestedQty);
  const { error } = await db
    .from("cart_items")
    .upsert({ cart_id: cartId, product_id: normalizedProductId, qty: nextQty }, { onConflict: "cart_id,product_id" });
  if (error) throw error;
  await db.from("carts").update({ updated_at: new Date().toISOString(), status: "active", abandoned_at: null }).eq("id", cartId);
  await linkCart(db, cartId);
  return itemsFor(db, cartId);
}

export async function setCartQty(productId: string, qty: number): Promise<CartItem[]> {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId || normalizedProductId.length > 200) throw new Error("Некорректный товар");
  const db = createSupabaseAdminClient();
  const id = await readCartId();
  if (!id) return [];
  const [
    { data: product, error: productError },
    { data: availability, error: availabilityError },
  ] = await Promise.all([
    db.from("products").select("id,stock,in_stock,is_available").eq("id", normalizedProductId).eq("status", "published").is("deleted_at", null).maybeSingle(),
    db.from("shop_settings").select("value").eq("key", "product_availability").maybeSingle(),
  ]);
  if (productError || availabilityError) throw productError ?? availabilityError;
  if (!product || product.is_available === false) throw new Error("Товар больше недоступен");
  if (!availability) throw new Error("Не удалось проверить наличие товара");

  const allowZeroStock = ((availability.value ?? {}) as { allow_zero_stock?: boolean }).allow_zero_stock !== false;
  if (!allowZeroStock && ((product.stock != null && product.stock <= 0) || (product.stock == null && product.in_stock === false))) {
    throw new Error("Товар закончился");
  }
  const stockLimit = !allowZeroStock && product.stock != null ? Math.max(1, product.stock) : MAX_QTY;
  const clamped = Math.max(1, Math.min(MAX_QTY, stockLimit, Math.round(Number(qty)) || 1));
  const { error } = await db.from("cart_items").update({ qty: clamped }).eq("cart_id", id).eq("product_id", normalizedProductId);
  if (error) throw error;
  return itemsFor(db, id);
}

export async function removeFromCart(productId: string): Promise<CartItem[]> {
  const db = createSupabaseAdminClient();
  const id = await readCartId();
  if (!id) return [];
  const { error } = await db.from("cart_items").delete().eq("cart_id", id).eq("product_id", productId);
  if (error) throw error;
  return itemsFor(db, id);
}

export async function clearCart(): Promise<void> {
  const db = createSupabaseAdminClient();
  const id = await readCartId();
  if (!id) return;
  const { error } = await db.from("cart_items").delete().eq("cart_id", id);
  if (error) throw error;
}
