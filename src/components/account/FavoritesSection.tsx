"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useAuth, normalizePhone } from "@/components/providers/AuthProvider";
import { useFavorites } from "@/components/providers/FavoritesProvider";
import { ProductCard } from "@/components/product/ProductCard";
import { getFavoriteProducts } from "@/lib/favorites/favorites-actions";
import type { Product } from "@/lib/data/products";

export function FavoritesSection() {
  const { user } = useAuth();
  const { ids } = useFavorites();
  const userKey = user ? normalizePhone(user.phone) : "";
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ключ зависимости — состав избранного (чтобы список обновлялся при снятии «сердечка»)
  const idsKey = React.useMemo(() => [...ids].sort().join(","), [ids]);

  React.useEffect(() => {
    let active = true;
    if (!userKey) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getFavoriteProducts(userKey)
      .then((list) => active && setProducts(list))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userKey, idsKey]);

  return (
    <div className="rounded-3xl bg-white border border-border/60 p-6 md:p-8">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink mb-1">Избранное</h2>
      <p className="text-sm text-ink-muted mb-6">Товары, которые вы отметили сердечком.</p>

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-muted">Загрузка…</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-2xl bg-surface text-ink-subtle">
            <Heart className="size-5" />
          </span>
          <p className="text-[15px] font-medium text-ink">Пока пусто</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Нажимайте на сердечко у товара, чтобы сохранить его здесь.
          </p>
          <a
            href="/category/iphone"
            className="mt-2 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink/85"
          >
            В каталог
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
