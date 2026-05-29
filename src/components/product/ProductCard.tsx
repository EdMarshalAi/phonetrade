"use client";

import * as React from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InfoBadge } from "@/components/ui/InfoBadge";
import { formatPrice } from "@/lib/utils/format-price";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/lib/data/products";

type Props = {
  product: Product;
  className?: string;
};

const BADGE_TOOLTIPS: Record<string, string> = {
  "Без RuStore":
    "Имеет недостаток в виде невозможности предустановки RuStore",
};

const FALLBACK_DOTS = 4;

export function ProductCard({ product, className }: Props) {
  const isRustore = product.badge?.toLowerCase().includes("rustore");
  const badgeClass = isRustore
    ? "bg-ink text-white"
    : "bg-white/95 text-ink backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

  const images = React.useMemo(() => {
    if (product.gallery && product.gallery.length > 0) return product.gallery;
    return [product.image];
  }, [product.gallery, product.image]);
  const hasGallery = images.length > 1;

  const [index, setIndex] = React.useState(0);

  const showNext = () => setIndex((i) => (i + 1) % images.length);
  const showPrev = () =>
    setIndex((i) => (i - 1 + images.length) % images.length);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-stop-card]")) return;
    window.location.href = `/product/${product.id}`;
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "group relative flex flex-col rounded-3xl bg-white border border-border/60 p-4 sm:p-5 cursor-pointer overflow-hidden",
        "transition-shadow duration-300 ease-[var(--ease-apple)]",
        "hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)]",
        className
      )}
    >
      <div className="relative -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 mb-4 bg-surface aspect-square overflow-hidden">
        {product.badge && (
          <div className="absolute top-3 left-3 z-20">
            <InfoBadge
              text={product.badge}
              tooltip={BADGE_TOOLTIPS[product.badge]}
              className={badgeClass}
            />
          </div>
        )}

        {product.isUsed && (
          <span className="absolute bottom-3 right-3 z-20 inline-flex items-center rounded-md bg-ink text-white text-[10px] font-semibold px-2 py-1 tracking-wide">
            Б/У
          </span>
        )}

        {/* Image layers — crossfade between slides */}
        {images.map((src, i) => (
          <div
            key={src + i}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-300 ease-[var(--ease-apple)]",
              i === index ? "opacity-100" : "opacity-0"
            )}
          >
            <Image
              src={src}
              alt={`${product.title} — фото ${i + 1}`}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-contain p-4 sm:p-6 transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-[1.04]"
              unoptimized
            />
          </div>
        ))}

        {hasGallery && (
          <>
            {/* Hover halves swap photos on hover but DON'T stop card click — */}
            {/* user can hover to preview angles, click anywhere → product page. */}
            <div
              aria-hidden
              onMouseEnter={showPrev}
              className="absolute inset-y-0 left-0 z-10 w-1/2 pointer-events-auto"
            />
            <div
              aria-hidden
              onMouseEnter={showNext}
              className="absolute inset-y-0 right-0 z-10 w-1/2 pointer-events-auto"
            />
          </>
        )}
      </div>

      <div
        className="flex justify-center gap-1 mb-4"
        aria-hidden={!hasGallery}
        role={hasGallery ? "tablist" : "presentation"}
      >
        {(hasGallery
          ? Array.from({ length: images.length })
          : Array.from({ length: FALLBACK_DOTS })
        ).map((_, i) => {
          const isActive = hasGallery ? i === index : i === 0;
          if (hasGallery) {
            return (
              <button
                key={i}
                type="button"
                role="tab"
                data-stop-card
                aria-selected={isActive}
                aria-label={`Фото ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  isActive ? "w-4 bg-ink" : "w-1.5 bg-ink/20 hover:bg-ink/40"
                )}
              />
            );
          }
          return (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                isActive ? "w-3.5 bg-ink" : "w-1.5 bg-ink/15"
              )}
            />
          );
        })}
      </div>

      <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-ink line-clamp-2 min-h-[44px]">
        {product.title}
      </h3>
      <p className="mt-1 text-xs text-ink-subtle capitalize">{product.color}</p>

      {product.isUsed && (
        <dl className="mt-3 space-y-1 text-xs text-ink-muted">
          {product.condition && (
            <div className="flex gap-1.5">
              <dt className="text-ink-subtle">Состояние:</dt>
              <dd className="line-clamp-1">{product.condition}</dd>
            </div>
          )}
          {typeof product.battery === "number" && (
            <div className="flex gap-1.5">
              <dt className="text-ink-subtle">Аккумулятор:</dt>
              <dd className="font-medium text-ink">{product.battery}%</dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex-1 min-h-3" />

      <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-subtle mb-1">
            Наличные
          </div>
          <div className="text-[19px] sm:text-xl font-bold text-sale tracking-tight tabular-nums leading-none">
            {formatPrice(product.priceCash)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-subtle mb-1">
            Картой
          </div>
          <div className="text-[19px] sm:text-xl font-bold text-ink tracking-tight tabular-nums leading-none">
            {formatPrice(product.priceCard)}
          </div>
        </div>
      </div>

      <div className="flex gap-2" data-stop-card>
        <Button
          variant="primary"
          size="md"
          className="flex-1 rounded-2xl"
          aria-label={`Купить ${product.title}`}
          onClick={(e) => e.stopPropagation()}
        >
          Купить
        </Button>
        <button
          type="button"
          aria-label="В избранное"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink-muted hover:bg-border/60 hover:text-ink transition-colors"
        >
          <Heart className="size-[18px]" />
        </button>
      </div>
    </article>
  );
}
