"use client";

import * as React from "react";
import Image from "next/image";
import { Heart, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductBadges } from "@/components/product/ProductBadges";
import { useCardSettings } from "@/components/product/CardSettings";
import { formatPrice } from "@/lib/utils/format-price";
import { productImages } from "@/lib/utils/product-images";
import { cn } from "@/lib/utils/cn";
import { useCart } from "@/components/providers/CartProvider";
import { useFavorites } from "@/components/providers/FavoritesProvider";
import type { Product } from "@/lib/data/products";

type Props = {
  product: Product;
  className?: string;
};

export function ProductCard({ product, className }: Props) {
  const { add } = useCart();
  const { display, options: optionDefs } = useCardSettings();
  const ptype = product.isUsed ? "used" : "new";
  const cardOptions = optionDefs
    .filter((o) => display.options.includes(o.key) && ((o.applies_to ?? "both") === "both" || o.applies_to === ptype))
    .map((o) => ({
      key: o.key,
      label: o.label,
      value: o.field ? ((product as unknown as Record<string, unknown>)[o.field] as string | undefined) : product.options?.[o.key],
    }))
    .filter((o) => o.value);
  const { enabled: favEnabled, has: favHas, toggle: favToggle } = useFavorites();
  const [added, setAdded] = React.useState(false);
  const addedTimer = React.useRef<number | null>(null);
  React.useEffect(() => () => { if (addedTimer.current) window.clearTimeout(addedTimer.current); }, []);

  const buy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void add(product);
    setAdded(true);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1600);
  };
  const images = React.useMemo(
    () => productImages(product),
    [product.gallery, product.image] // eslint-disable-line react-hooks/exhaustive-deps
  );
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
        {display.badges ? (
          <>
            <ProductBadges badges={product.badges} position="tl" className="absolute top-3 left-3 z-20 max-w-[65%]" />
            <ProductBadges badges={product.badges} position="tr" className="absolute top-3 right-3 z-20 max-w-[65%] justify-end" />
            <ProductBadges badges={product.badges} position="bl" className="absolute bottom-3 left-3 z-20 max-w-[65%]" />
          </>
        ) : null}

        <div className="absolute bottom-3 right-3 z-20 flex max-w-[65%] flex-col items-end gap-1.5">
          {display.badges ? <ProductBadges badges={product.badges} position="br" className="justify-end" /> : null}
          {product.isUsed && (
            <span className="inline-flex items-center rounded-md bg-ink text-white text-[10px] font-semibold px-2 py-1 tracking-wide">
              Б/У
            </span>
          )}
        </div>

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

      {/* Точки-индикаторы — только при реальной галерее (>1 фото).
          Фиксированная высота строки сохраняется всегда, чтобы карточки
          в сетке оставались выровнены по высоте. */}
      <div
        className="flex h-1.5 justify-center gap-1 mb-4"
        role={hasGallery ? "tablist" : "presentation"}
      >
        {hasGallery
          ? images.map((_, i) => {
              const isActive = i === index;
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
            })
          : null}
      </div>

      <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-ink line-clamp-2 min-h-[44px]">
        {product.title}
      </h3>
      <p className="mt-1 text-xs text-ink-subtle capitalize">{product.color}</p>

      {cardOptions.length > 0 || (product.isUsed && typeof product.battery === "number") ? (
        <dl className="mt-3 space-y-1 text-xs text-ink-muted">
          {cardOptions.map((o) => (
            <div key={o.key} className="flex gap-1.5">
              <dt className="text-ink-subtle">{o.label}:</dt>
              <dd className="line-clamp-1">{o.value}</dd>
            </div>
          ))}
          {product.isUsed && typeof product.battery === "number" && (
            <div className="flex gap-1.5">
              <dt className="text-ink-subtle">Аккумулятор:</dt>
              <dd className="font-medium text-ink">{product.battery}%</dd>
            </div>
          )}
        </dl>
      ) : null}

      <div className="flex-1 min-h-3" />

      <div className={cn("grid gap-3 mt-4 mb-1", display.cash && display.card ? "grid-cols-2" : "grid-cols-1")}>
        {display.cash ? (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-subtle mb-1">Наличные</div>
            <div className="text-[19px] sm:text-xl font-bold text-sale tracking-tight tabular-nums leading-none">
              {formatPrice(product.priceCash)}
            </div>
            {display.old_price && product.priceOld && product.priceOld > product.priceCash ? (
              <div className="mt-1 text-[12px] text-ink-subtle line-through tabular-nums">{formatPrice(product.priceOld)}</div>
            ) : null}
          </div>
        ) : null}
        {display.card ? (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-subtle mb-1">Картой</div>
            <div className="text-[19px] sm:text-xl font-bold text-ink tracking-tight tabular-nums leading-none">
              {formatPrice(product.priceCard)}
            </div>
          </div>
        ) : null}
      </div>
      {display.credit && product.installmentFrom ? (
        <div className="mb-4 mt-2 text-[12px] text-ink-subtle">
          В кредит — от <span className="font-medium text-ink">{formatPrice(product.installmentFrom)}/мес</span>
        </div>
      ) : (
        <div className="mb-4" />
      )}

      <div className="flex gap-2" data-stop-card>
        <Button
          variant="primary"
          size="md"
          className="flex-1 rounded-2xl"
          aria-label={`Купить ${product.title}`}
          onClick={buy}
        >
          {added ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-[18px]" strokeWidth={2.25} /> В корзине
            </span>
          ) : (
            "Купить"
          )}
        </Button>
        {favEnabled && (
          <button
            type="button"
            aria-label={favHas(product.id) ? "Убрать из избранного" : "В избранное"}
            aria-pressed={favHas(product.id)}
            onClick={(e) => {
              e.stopPropagation();
              void favToggle(product);
            }}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
              favHas(product.id)
                ? "bg-ink text-white hover:bg-ink/90"
                : "bg-surface text-ink-muted hover:bg-border/60 hover:text-ink"
            )}
          >
            <Heart className={cn("size-[18px]", favHas(product.id) && "fill-current")} />
          </button>
        )}
      </div>
    </article>
  );
}
