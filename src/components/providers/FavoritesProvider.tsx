"use client";

import * as React from "react";
import { useAuth, normalizePhone } from "@/components/providers/AuthProvider";
import type { Product } from "@/lib/data/products";
import { getFavoriteIds, setFavorite } from "@/lib/favorites/favorites-actions";

type FavoritesContextValue = {
  /** Показывать ли «в избранное» (только для авторизованных). */
  enabled: boolean;
  ids: Set<string>;
  has: (productId: string) => boolean;
  toggle: (product: Product) => Promise<void>;
};

const FavoritesContext = React.createContext<FavoritesContextValue | null>(null);

/** Избранное в БД, привязано к телефону текущего пользователя. */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userKey = user ? normalizePhone(user.phone) : "";
  const [ids, setIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let active = true;
    if (!userKey) {
      setIds(new Set());
      return;
    }
    getFavoriteIds(userKey)
      .then((list) => active && setIds(new Set(list)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userKey]);

  const toggle = React.useCallback(
    async (product: Product) => {
      if (!userKey) return;
      const on = !ids.has(product.id);
      // оптимистично
      setIds((prev) => {
        const next = new Set(prev);
        if (on) next.add(product.id);
        else next.delete(product.id);
        return next;
      });
      try {
        const res = await setFavorite(userKey, product.id, on);
        setIds(new Set(res.ids));
      } catch {
        /* откат не критичен — перезагрузка синхронизирует */
      }
    },
    [userKey, ids]
  );

  const value = React.useMemo<FavoritesContextValue>(
    () => ({ enabled: !!userKey, ids, has: (id) => ids.has(id), toggle }),
    [userKey, ids, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = React.useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within <FavoritesProvider>");
  return ctx;
}
