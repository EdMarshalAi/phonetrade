"use client";

import * as React from "react";
import Image from "next/image";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils/format-price";
import { MAX_QTY } from "@/lib/cart/constants";
import type { CartItem } from "@/lib/cart/types";
import { useFavorites } from "@/components/providers/FavoritesProvider";
import { cn } from "@/lib/utils/cn";

type Props = {
  items: CartItem[];
  onQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear?: () => void;
  /** База цены выбранного способа оплаты — наличные/СБП или картой. */
  base?: "cash" | "card";
};

export function CartItemsSection({ items, onQty, onRemove, onClear, base = "cash" }: Props) {
  const { has: favHas, toggle: favToggle } = useFavorites();
  const [confirmClear, setConfirmClear] = React.useState(false);
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
        const linePrice = (base === "card" ? product.priceCard : product.priceCash) * qty;
        const priceLabel = base === "card" ? "Картой" : "Наличные";
        const isFavorite = favHas(product.id);
        return (
          <li key={product.id} className="flex gap-4 sm:gap-5 p-4 sm:p-5 md:p-6">
            <a
              href={`/product/${product.id}`}
              className="relative shrink-0 size-[88px] sm:size-28 self-start overflow-hidden rounded-2xl bg-surface ring-1 ring-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
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

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={`/product/${product.id}`}
                    className="block text-[15px] md:text-base font-semibold leading-snug text-ink transition-opacity hover:opacity-80"
                  >
                    {product.title}
                  </a>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">
                    {[product.color, product.memory, product.sim].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                      <span aria-hidden className={cn("size-1.5 rounded-full", product.inStock ? "bg-emerald-500" : "bg-ink/30")} />
                      {product.inStock ? "В наличии" : "Уточняйте наличие"}
                    </span>
                    {product.sku ? <span className="text-ink-subtle">· Арт. {product.sku}</span> : null}
                  </div>
                </div>

                {/* Цена + старая цена справа (как в референсе) */}
                <div className="shrink-0 text-right">
                  <div
                    className={cn(
                      "text-[17px] md:text-xl font-bold leading-none tracking-tight tabular-nums",
                      base === "card" ? "text-ink" : "text-sale"
                    )}
                  >
                    {formatPrice(linePrice)}
                  </div>
                  {base === "cash" && product.priceCard > product.priceCash ? (
                    <div className="mt-1 text-[12px] leading-none text-ink-subtle line-through tabular-nums">
                      {formatPrice(product.priceCard * qty)}
                    </div>
                  ) : null}
                  <div className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-subtle">{priceLabel}</div>
                </div>
              </div>

              {/* Контролы: счётчик слева, избранное/удалить справа */}
              <div className="mt-4 flex items-center justify-between gap-3 pt-1">
                <div className="inline-flex items-center rounded-full border border-border/60 bg-white">
                  <button
                    type="button"
                    aria-label="Уменьшить количество"
                    onClick={() => onQty(product.id, qty - 1)}
                    disabled={qty <= 1}
                    className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
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
                    className="w-8 rounded bg-transparent text-center text-sm font-medium tabular-nums text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  />
                  <button
                    type="button"
                    aria-label="Увеличить количество"
                    onClick={() => onQty(product.id, qty + 1)}
                    disabled={qty >= MAX_QTY}
                    className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
                    aria-pressed={isFavorite}
                    onClick={() => void favToggle(product)}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-9 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Heart className={cn("size-4 transition-colors", isFavorite && "fill-sale text-sale")} />
                    <span className="hidden sm:inline">{isFavorite ? "В избранном" : "В избранное"}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Удалить из корзины"
                    onClick={() => onRemove(product.id)}
                    className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-sale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}

      {onClear && items.length > 0 && (
        <li className="flex justify-end p-4 sm:p-5">
          <button
            type="button"
            onClick={() => {
              if (confirmClear) {
                onClear();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
                window.setTimeout(() => setConfirmClear(false), 3000);
              }
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 h-9 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
              confirmClear
                ? "bg-sale/10 text-sale"
                : "text-ink-muted hover:bg-surface hover:text-ink"
            )}
          >
            <Trash2 className="size-4" />
            {confirmClear ? "Точно очистить?" : "Очистить корзину"}
          </button>
        </li>
      )}
    </ul>
  );
}
