"use client";

import * as React from "react";
import Image from "next/image";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils/format-price";
import { MAX_QTY } from "@/lib/cart/constants";
import type { CartItem } from "@/lib/cart/types";
import { cn } from "@/lib/utils/cn";

type Props = {
  items: CartItem[];
  favorites: Set<string>;
  onQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
};

export function CartItemsSection({
  items,
  favorites,
  onQty,
  onRemove,
  onToggleFavorite,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-ink">Корзина пуста</p>
        <p className="mt-2 text-sm text-ink-muted">
          Загляните в каталог — там много новых iPhone, MacBook и AirPods.
        </p>
        <a
          href="/category/iphone"
          className="inline-flex items-center mt-6 h-11 px-6 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
        >
          В каталог
        </a>
      </div>
    );
  }

  return (
    <ul className="-mx-5 md:-mx-7 -mb-5 md:-mb-7 divide-y divide-border/60">
      {items.map(({ product, qty }) => {
        const lineCash = product.priceCash * qty;
        const isFavorite = favorites.has(product.id);
        return (
          <li
            key={product.id}
            className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-5 md:p-6"
          >
            <a
              href={`/product/${product.id}`}
              className="relative shrink-0 size-24 sm:size-28 rounded-2xl bg-surface overflow-hidden self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="112px"
                className="object-contain p-2.5"
                unoptimized
              />
            </a>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 justify-between">
                <a
                  href={`/product/${product.id}`}
                  className="text-[15px] md:text-base font-semibold text-ink leading-snug hover:opacity-80 transition-opacity rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                >
                  {product.title}
                </a>
                <span className="text-[11px] text-ink-subtle tabular-nums shrink-0">
                  #{product.id.toUpperCase()}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {product.color}
                {product.memory && ` · ${product.memory}`}
                {product.sim && ` · ${product.sim}`}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      product.inStock ? "bg-emerald-500" : "bg-ink/30"
                    )}
                  />
                  {product.inStock ? "В наличии" : "Уточняйте"}
                </span>
                <span className="text-ink-subtle">·</span>
                <span className="text-ink-muted">
                  Доставим завтра по Белгороду
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div className="inline-flex items-center rounded-full border border-border/60 bg-white">
                  <button
                    type="button"
                    aria-label="Уменьшить количество"
                    onClick={() => onQty(product.id, qty - 1)}
                    disabled={qty <= 1}
                    className="inline-flex size-11 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-40 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Количество"
                    value={qty}
                    onChange={(e) => {
                      const next = parseInt(e.target.value.replace(/\D/g, ""), 10);
                      if (!Number.isNaN(next)) onQty(product.id, next);
                    }}
                    className="w-10 text-center text-sm font-medium text-ink tabular-nums bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ink/40 rounded"
                  />
                  <button
                    type="button"
                    aria-label="Увеличить количество"
                    onClick={() => onQty(product.id, qty + 1)}
                    disabled={qty >= MAX_QTY}
                    className="inline-flex size-11 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-40 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-baseline gap-3">
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wider text-ink-subtle">
                      Наличные
                    </div>
                    <div className="text-lg font-bold text-sale tracking-tight tabular-nums leading-none">
                      {formatPrice(lineCash)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={
                      isFavorite ? "Убрать из избранного" : "В избранное"
                    }
                    aria-pressed={isFavorite}
                    onClick={() => onToggleFavorite(product.id)}
                    className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Heart
                      className={cn(
                        "size-4 transition-colors",
                        isFavorite && "fill-sale text-sale"
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="Удалить из корзины"
                    onClick={() => onRemove(product.id)}
                    className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-sale hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
