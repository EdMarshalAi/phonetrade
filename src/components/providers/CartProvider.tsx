"use client";

import * as React from "react";
import type { CartItem } from "@/lib/cart/types";
import type { Product } from "@/lib/data/products";
import {
  getCart,
  addToCart,
  setCartQty,
  removeFromCart,
  clearCart,
} from "@/lib/cart/cart-actions";

type CartContextValue = {
  items: CartItem[];
  count: number;
  /** false до первой загрузки корзины из БД */
  ready: boolean;
  add: (product: Product, qty?: number) => Promise<void>;
  setQty: (productId: string, qty: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CartContext = React.createContext<CartContextValue | null>(null);

/** Корзина живёт в БД (анонимная, по httpOnly-куке) — без localStorage и моков. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    getCart()
      .then((i) => setItems(i))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const add = React.useCallback(async (product: Product, qty = 1) => {
    setItems(await addToCart(product.id, qty));
  }, []);
  const setQty = React.useCallback(async (productId: string, qty: number) => {
    setItems(await setCartQty(productId, qty));
  }, []);
  const remove = React.useCallback(async (productId: string) => {
    setItems(await removeFromCart(productId));
  }, []);
  const clear = React.useCallback(async () => {
    await clearCart();
    setItems([]);
  }, []);

  const count = items.reduce((acc, i) => acc + i.qty, 0);

  const value = React.useMemo<CartContextValue>(
    () => ({ items, count, ready, add, setQty, remove, clear }),
    [items, count, ready, add, setQty, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
