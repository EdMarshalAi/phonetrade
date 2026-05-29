"use client";

import * as React from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { Check, X } from "lucide-react";
import {
  FACET_LABELS,
  type CategoryConfig,
  type FilterFacet,
} from "@/lib/catalog/category-config";
import type { CatalogFilters, FacetOptions } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CategoryConfig;
  facetOptions: FacetOptions;
  filters: CatalogFilters;
  onToggle: (facet: keyof CatalogFilters, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onSetFilters: (filters: CatalogFilters) => void;
};

const LIST_FACETS: Exclude<FilterFacet, "battery">[] = [
  "model",
  "memory",
  "color",
  "sim",
  "condition",
];

function CheckboxRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-1.5 py-2.5 rounded-lg text-left text-[15px] text-ink hover:bg-surface transition-colors"
      >
        <span className="inline-flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-md border transition-all",
              checked
                ? "bg-ink border-ink text-white"
                : "border-border bg-white"
            )}
          >
            {checked && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <span className="truncate">{label}</span>
        </span>
        <span className="text-xs text-ink-subtle tabular-nums shrink-0">
          {count}
        </span>
      </button>
    </li>
  );
}

export function FilterDrawer({
  open,
  onOpenChange,
  config,
  facetOptions,
  filters,
  onToggle,
  onApply,
  onReset,
  onSetFilters,
}: Props) {
  const facets = config.facets;

  const [priceMin, setPriceMin] = React.useState<string>(
    typeof filters.priceMin === "number" ? String(filters.priceMin) : ""
  );
  const [priceMax, setPriceMax] = React.useState<string>(
    typeof filters.priceMax === "number" ? String(filters.priceMax) : ""
  );

  React.useEffect(() => {
    if (open) {
      setPriceMin(
        typeof filters.priceMin === "number" ? String(filters.priceMin) : ""
      );
      setPriceMax(
        typeof filters.priceMax === "number" ? String(filters.priceMax) : ""
      );
    }
  }, [open, filters.priceMin, filters.priceMax]);

  const handleApplyPrice = React.useCallback(() => {
    const min = priceMin === "" ? undefined : Number(priceMin);
    const max = priceMax === "" ? undefined : Number(priceMax);
    onSetFilters({
      ...filters,
      priceMin: Number.isFinite(min) ? (min as number) : undefined,
      priceMax: Number.isFinite(max) ? (max as number) : undefined,
    });
  }, [priceMin, priceMax, filters, onSetFilters]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-[80] bg-ink/30 backdrop-blur-sm",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "transition-opacity duration-300"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed inset-y-0 left-0 z-[81] flex w-full max-w-[420px] flex-col bg-white",
            "shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
            "data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
            "transition-transform duration-300 ease-[var(--ease-apple)]"
          )}
        >
          <header className="flex items-center justify-between gap-4 h-16 px-6 border-b border-border/60">
            <Dialog.Title className="text-lg font-semibold text-ink">
              Фильтры
            </Dialog.Title>
            <Dialog.Close
              className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface hover:text-ink transition-colors"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* Price */}
            <section>
              <h3 className="text-xs uppercase tracking-[0.16em] text-ink-subtle mb-3">
                Цена, ₽
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={String(facetOptions.priceMin)}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  onBlur={handleApplyPrice}
                  className="w-full h-11 px-4 rounded-xl bg-surface text-sm text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors"
                  aria-label="Минимальная цена"
                />
                <span className="text-ink-subtle">—</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={String(facetOptions.priceMax)}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  onBlur={handleApplyPrice}
                  className="w-full h-11 px-4 rounded-xl bg-surface text-sm text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors"
                  aria-label="Максимальная цена"
                />
              </div>
              <p className="mt-2 text-xs text-ink-subtle">
                В наличии от{" "}
                <span className="tabular-nums">
                  {facetOptions.priceMin.toLocaleString("ru-RU")}
                </span>{" "}
                до{" "}
                <span className="tabular-nums">
                  {facetOptions.priceMax.toLocaleString("ru-RU")}
                </span>{" "}
                ₽
              </p>
            </section>

            {/* Facet lists */}
            {LIST_FACETS.filter((f) => facets.includes(f)).map((facet) => {
              const options = facetOptions[facet];
              if (!options || options.length === 0) return null;
              const selected = filters[facet];
              return (
                <section key={facet}>
                  <h3 className="text-xs uppercase tracking-[0.16em] text-ink-subtle mb-3">
                    {FACET_LABELS[facet]}
                  </h3>
                  <ul className="flex flex-col">
                    {options.map((opt) => (
                      <CheckboxRow
                        key={opt.value}
                        label={opt.value}
                        count={opt.count}
                        checked={selected.includes(opt.value)}
                        onToggle={() =>
                          onToggle(facet as keyof CatalogFilters, opt.value)
                        }
                      />
                    ))}
                  </ul>
                </section>
              );
            })}

            {facets.includes("battery") && (
              <section>
                <h3 className="text-xs uppercase tracking-[0.16em] text-ink-subtle mb-3">
                  Аккумулятор, не менее
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[80, 85, 90, 95].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        onSetFilters({
                          ...filters,
                          batteryMin: filters.batteryMin === v ? undefined : v,
                        })
                      }
                      className={cn(
                        "inline-flex items-center h-9 px-4 rounded-full text-[13px] font-medium transition-colors",
                        filters.batteryMin === v
                          ? "bg-ink text-white"
                          : "bg-surface text-ink hover:bg-border/60"
                      )}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <footer className="border-t border-border/60 px-6 py-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onReset}
              className="flex-1 inline-flex items-center justify-center h-11 px-4 rounded-xl text-sm font-medium text-ink hover:bg-surface transition-colors"
            >
              Сбросить
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 inline-flex items-center justify-center h-11 px-4 rounded-xl bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors"
            >
              Применить
            </button>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
