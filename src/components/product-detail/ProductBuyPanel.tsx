"use client";

import * as React from "react";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils/format-price";
import { cn } from "@/lib/utils/cn";
import { useCart } from "@/components/providers/CartProvider";
import { useFavorites } from "@/components/providers/FavoritesProvider";
import type { Product } from "@/lib/data/products";

type Props = {
  product: Product;
  variants: { colors: Product[]; memories: Product[]; sims: Product[] };
};

// Подбор цвета-плашки по названию (RU/EN). Порядок важен: специфичные токены
// раньше общих, цвет-в-титане определяется по ведущему слову до «титан».
function colorSwatchClass(colorName: string): string {
  const k = colorName.toLowerCase();
  if (k.includes("сияющ") || k.includes("звезд") || k.includes("starlight")) return "bg-[#f3ead7]";
  if (k.includes("ноч") || k.includes("midnight")) return "bg-[#2a2f3a]";
  if (k.includes("натуральн") || k.includes("natural")) return "bg-[#b9b2a6]";
  if (k.includes("угольно")) return "bg-[#26262a]";
  if (k.includes("чёрн") || k.includes("черн") || k.includes("black")) return "bg-[#1a1a1d]";
  if (k.includes("бел") || k.includes("white")) return "bg-white border border-border";
  if (k.includes("серебр") || k.includes("silver")) return "bg-[#e3e4e6]";
  if (k.includes("золот") || k.includes("gold")) return "bg-[#d6c4a4]";
  if (k.includes("оранж") || k.includes("orange")) return "bg-[#dd5b2a]";
  if (k.includes("чили") || k.includes("малин") || k.includes("красн") || k.includes("red")) return "bg-[#c41d3d]";
  if (k.includes("фламинго")) return "bg-[#e8a0a8]";
  if (k.includes("розов") || k.includes("pink")) return "bg-[#d8a8b4]";
  if (k.includes("фиолет") || k.includes("violet") || k.includes("purple") || k.includes("пурпур")) return "bg-[#7a5ea8]";
  if (k.includes("ультрамарин")) return "bg-[#2f4bd6]";
  if (k.includes("индиго") || k.includes("indigo")) return "bg-[#3b4a8c]";
  if (k.includes("голуб")) return "bg-[#6aa9e0]";
  if (k.includes("бирюз") || k.includes("teal")) return "bg-[#4bbfb0]";
  if (k.includes("син") || k.includes("blue")) return "bg-[#3a5b78]";
  if (k.includes("мятн") || k.includes("mint")) return "bg-[#a9d8c2]";
  if (k.includes("олив")) return "bg-[#7d7f4e]";
  if (k.includes("зелён") || k.includes("зелен") || k.includes("sage") || k.includes("green")) return "bg-[#7f8d75]";
  if (k.includes("лаванд") || k.includes("сирен")) return "bg-[#b6aed8]";
  if (k.includes("лимон") || k.includes("жёлт") || k.includes("желт") || k.includes("yellow")) return "bg-[#f0d36a]";
  if (k.includes("беж") || k.includes("песоч") || k.includes("капучино") || k.includes("beige")) return "bg-[#d8cbb4]";
  if (k.includes("косм") || k.includes("space")) return "bg-[#5b5e62]";
  if (k.includes("титан") || k.includes("titanium")) return "bg-[#867e74]";
  if (k.includes("сер") || k.includes("gray") || k.includes("grey")) return "bg-[#5b5e62]";
  return "bg-surface border border-border";
}

export function ProductBuyPanel({ product, variants }: Props) {
  const { add } = useCart();
  const { enabled: favEnabled, has: favHas, toggle: favToggle } = useFavorites();
  const [added, setAdded] = React.useState(false);

  const handleAdd = () => {
    void add(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  const colorOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return variants.colors
      .filter((v) => (seen.has(v.color) ? false : (seen.add(v.color), true)))
      .sort((a, b) => a.color.localeCompare(b.color, "ru"));
  }, [variants.colors]);

  const memoryOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return variants.memories
      .filter((v) =>
        v.memory && !seen.has(v.memory) ? (seen.add(v.memory), true) : false
      )
      .sort((a, b) => {
        const order = ["64GB", "128GB", "256GB", "512GB", "1TB"];
        return order.indexOf(a.memory ?? "") - order.indexOf(b.memory ?? "");
      });
  }, [variants.memories]);

  // SIM как третья ось (eSIM / eSIM + SIM …). Скрыт, если в группе один вариант.
  const simOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return variants.sims
      .filter((v) => (v.sim && !seen.has(v.sim) ? (seen.add(v.sim), true) : false))
      .sort((a, b) => (a.sim ?? "").localeCompare(b.sim ?? "", "ru"));
  }, [variants.sims]);

  const limitedHighlights = (product.highlights ?? []).slice(0, 3);

  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-[140px]">
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">
              {product.model}
            </span>
            {product.isNew && (
              <span className="text-xs uppercase tracking-wider text-sale">
                Новинка
              </span>
            )}
          </div>
          <span
            aria-label="Артикул"
            className="text-[11px] tabular-nums tracking-wider text-ink-subtle/60 shrink-0"
          >
            Арт. {product.sku || product.id.toUpperCase()}
          </span>
        </div>
        {/* Характеристики товара — показываем всегда (не зависят от вариантов) */}
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {product.color ? (
            <div className="flex gap-1.5"><dt className="text-ink-subtle">Цвет:</dt><dd className="text-ink capitalize">{product.color}</dd></div>
          ) : null}
          {product.memory ? (
            <div className="flex gap-1.5"><dt className="text-ink-subtle">Память:</dt><dd className="text-ink">{product.memory}</dd></div>
          ) : null}
          {product.sim ? (
            <div className="flex gap-1.5"><dt className="text-ink-subtle">SIM:</dt><dd className="text-ink">{product.sim}</dd></div>
          ) : null}
        </dl>
      </div>

      {product.shortDescription ? (
        <p className="text-[15px] leading-relaxed text-ink-muted">{product.shortDescription}</p>
      ) : null}

      {colorOptions.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">
              Цвет
            </span>
            <span className="text-sm text-ink-muted">{product.color}</span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {colorOptions.map((v) => {
              const active = v.id === product.id;
              return (
                <li key={v.id}>
                  <a
                    href={`/product/${v.id}`}
                    aria-label={v.color}
                    title={v.color}
                    className={cn(
                      "block size-10 rounded-full p-0.5 transition-all",
                      active
                        ? "ring-2 ring-ink ring-offset-2 ring-offset-bg"
                        : "hover:ring-2 hover:ring-border hover:ring-offset-2 hover:ring-offset-bg"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "block w-full h-full rounded-full",
                        colorSwatchClass(v.color)
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {memoryOptions.length > 1 && (
        <div>
          <span className="block text-xs uppercase tracking-[0.16em] text-ink-subtle mb-3">
            Память
          </span>
          <ul className="flex flex-wrap gap-2">
            {memoryOptions.map((v) => {
              const active = v.id === product.id;
              return (
                <li key={v.id}>
                  <a
                    href={`/product/${v.id}`}
                    className={cn(
                      "inline-flex items-center h-10 px-4 rounded-xl text-sm font-medium transition-colors border",
                      active
                        ? "bg-ink text-white border-ink"
                        : "bg-white border-border text-ink hover:border-ink/30"
                    )}
                  >
                    {v.memory}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {simOptions.length > 1 && (
        <div>
          <span className="block text-xs uppercase tracking-[0.16em] text-ink-subtle mb-3">
            SIM
          </span>
          <ul className="flex flex-wrap gap-2">
            {simOptions.map((v) => {
              const active = v.id === product.id;
              return (
                <li key={v.id}>
                  <a
                    href={`/product/${v.id}`}
                    className={cn(
                      "inline-flex items-center h-10 px-4 rounded-xl text-sm font-medium transition-colors border",
                      active
                        ? "bg-ink text-white border-ink"
                        : "bg-white border-border text-ink hover:border-ink/30"
                    )}
                  >
                    {v.sim}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {product.isUsed && (product.conditionText || product.battery != null) ? (
        <div className="rounded-3xl border border-border/60 bg-surface/40 p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">Состояние</span>
            {product.battery != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[12px] font-medium text-white tabular-nums">
                🔋 Аккумулятор: {product.battery}%
              </span>
            ) : null}
          </div>
          {product.conditionText ? (
            <p className="text-[14px] leading-relaxed text-ink-muted">{product.conditionText}</p>
          ) : null}
          <p className="mt-2 text-[11px] text-ink-subtle">Фото для иллюстрации — реальный товар может отличаться.</p>
        </div>
      ) : null}

      <div className="rounded-3xl bg-white border border-border/60 p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-subtle mb-1">
              Наличные
            </div>
            <div className="text-3xl md:text-[34px] font-bold text-sale tracking-tight tabular-nums leading-none">
              {formatPrice(product.priceCash)}
            </div>
            {product.priceOld && product.priceOld > product.priceCash ? (
              <div className="mt-1.5 text-[13px] text-ink-subtle line-through tabular-nums">
                {formatPrice(product.priceOld)}
              </div>
            ) : null}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-subtle mb-1">
              Картой
            </div>
            <div className="text-3xl md:text-[34px] font-bold text-ink tracking-tight tabular-nums leading-none">
              {formatPrice(product.priceCard)}
            </div>
          </div>
        </div>

        {product.installmentFrom ? (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-border/60 bg-surface/50 px-4 py-2.5 text-[13px] text-ink-muted">
            <span>
              В кредит — от{" "}
              <span className="font-semibold text-ink tabular-nums">{formatPrice(product.installmentFrom)}/мес</span>
            </span>
            {product.installmentPartner ? (
              <span className="text-ink-subtle">· {product.installmentPartner}</span>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleAdd}
            className="flex-1 rounded-2xl"
          >
            {added ? (
              <>
                <Check className="size-4" aria-hidden />В корзине
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" aria-hidden />В корзину
              </>
            )}
          </Button>
          {favEnabled && (
            <button
              type="button"
              aria-label={favHas(product.id) ? "Убрать из избранного" : "В избранное"}
              aria-pressed={favHas(product.id)}
              onClick={() => void favToggle(product)}
              className={cn(
                "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors border",
                favHas(product.id)
                  ? "bg-ink text-white border-ink"
                  : "bg-surface text-ink-muted hover:text-ink border-transparent"
              )}
            >
              <Heart
                className={cn("size-5", favHas(product.id) && "fill-current")}
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>

      {limitedHighlights.length > 0 && (
        <ul className="space-y-2.5">
          {limitedHighlights.map((h) => (
            <li
              key={h}
              className="flex items-start gap-3 text-[14px] text-ink"
            >
              <span
                aria-hidden
                className="mt-[7px] inline-flex size-1.5 shrink-0 rounded-full bg-ink"
              />
              <span className="leading-relaxed">{h}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
