"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/data/products";
import { cn } from "@/lib/utils/cn";

type Props = {
  products: Product[];
  total: number;
  hasMore: boolean;
  pageSize: number;
  onLoadMore: () => void;
};

function pluralizeRu(n: number, [a, b, c]: [string, string, string]): string {
  const last = n % 10;
  const last2 = n % 100;
  if (last === 1 && last2 !== 11) return a;
  if ([2, 3, 4].includes(last) && ![12, 13, 14].includes(last2)) return b;
  return c;
}

export function ProductGrid({
  products,
  total,
  hasMore,
  pageSize,
  onLoadMore,
}: Props) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-surface py-20 text-center">
        <p className="text-base text-ink-muted">
          По выбранным фильтрам ничего не найдено
        </p>
        <p className="mt-2 text-sm text-ink-subtle">
          Попробуйте снять часть фильтров или поискать в других категориях.
        </p>
      </div>
    );
  }

  const percent = total === 0 ? 0 : Math.round((products.length / total) * 100);
  const remaining = Math.max(0, total - products.length);
  const nextChunk = Math.min(pageSize, remaining);
  const productWord = pluralizeRu(total, ["товара", "товаров", "товаров"]);

  return (
    <>
      <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <div className="mt-10 md:mt-14 flex flex-col md:flex-row items-stretch md:items-center gap-5 md:gap-6">
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            className={cn(
              "group inline-flex items-center justify-center gap-3 h-12 pl-7 pr-2 rounded-full shrink-0",
              "bg-ink text-white text-sm font-medium",
              "transition-all duration-300 ease-[var(--ease-apple)]",
              "hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.35)] hover:-translate-y-0.5"
            )}
          >
            Показать ещё
            <span className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-white/15 text-[12px] font-semibold tabular-nums">
              <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
              {nextChunk}
            </span>
          </button>
        ) : (
          <span className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-surface text-ink-muted text-sm shrink-0">
            Это все товары категории
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-2 text-[13px]">
            <span className="text-ink-muted">
              Показано{" "}
              <span className="font-semibold text-ink tabular-nums">
                {products.length}
              </span>{" "}
              из{" "}
              <span className="font-semibold text-ink tabular-nums">{total}</span>{" "}
              {productWord}
            </span>
            <span className="tabular-nums text-ink-subtle">{percent}%</span>
          </div>
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-border/60"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Показано ${products.length} из ${total}`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-500 ease-[var(--ease-apple)]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
