"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/lib/data/products";

type Props = { products: Product[] };

export function ProductRelated({ products }: Props) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, products.length]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div>
      <header className="flex items-end justify-between gap-6 flex-wrap mb-8">
        <div>
          <span className="block text-xs uppercase tracking-[0.18em] text-ink-subtle mb-2">
            Похожие модели
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-ink">
            Сопутствующие товары
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Назад"
            onClick={() => scrollBy(-400)}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full bg-white border border-border/60 text-ink transition-all",
              canLeft
                ? "opacity-100 hover:bg-surface"
                : "opacity-40 pointer-events-none"
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Вперёд"
            onClick={() => scrollBy(400)}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full bg-white border border-border/60 text-ink transition-all",
              canRight
                ? "opacity-100 hover:bg-surface"
                : "opacity-40 pointer-events-none"
            )}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide scroll-smooth snap-x"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="shrink-0 w-[260px] sm:w-[280px] lg:w-[300px] snap-card"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
