"use client";

import * as React from "react";
import { Menu } from "@base-ui-components/react/menu";
import {
  ArrowUpDown,
  ChevronDown,
  Check,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  FACET_LABELS,
  SORT_LABELS,
  type CategoryConfig,
  type FilterFacet,
  type SortKey,
} from "@/lib/catalog/category-config";
import type { CatalogFilters, FacetOptions } from "@/lib/catalog/filters";
import { QuickFacetPopover } from "@/components/catalog/QuickFacetPopover";
import { QuickPricePopover } from "@/components/catalog/QuickPricePopover";
import { cn } from "@/lib/utils/cn";

type Props = {
  config: CategoryConfig;
  facetOptions: FacetOptions;
  filters: CatalogFilters;
  sort: SortKey;
  activeCount: number;
  onToggle: (facet: keyof CatalogFilters, value: string) => void;
  onSetSort: (sort: SortKey) => void;
  onOpenDrawer: () => void;
  onReset: () => void;
  onSetFilters: (filters: CatalogFilters) => void;
};

function clearFacet(
  filters: CatalogFilters,
  facet: keyof CatalogFilters,
  onSetFilters: (next: CatalogFilters) => void
) {
  if (
    facet === "priceMin" ||
    facet === "priceMax" ||
    facet === "batteryMin"
  ) {
    onSetFilters({ ...filters, [facet]: undefined });
  } else {
    onSetFilters({ ...filters, [facet]: [] });
  }
}

export function QuickFilterBar({
  config,
  facetOptions,
  filters,
  sort,
  activeCount,
  onToggle,
  onSetSort,
  onOpenDrawer,
  onReset,
  onSetFilters,
}: Props) {
  const renderQuickFacet = (facet: FilterFacet) => {
    if (facet === "battery") return null;
    const options = facetOptions[facet] ?? [];
    if (options.length === 0) return null;
    const selected = filters[facet as keyof CatalogFilters] as string[];
    return (
      <QuickFacetPopover
        key={facet}
        label={FACET_LABELS[facet]}
        options={options}
        selected={selected}
        onToggle={(v) => onToggle(facet as keyof CatalogFilters, v)}
        onClear={() =>
          clearFacet(filters, facet as keyof CatalogFilters, onSetFilters)
        }
      />
    );
  };

  return (
    <div
      className={cn(
        "sticky top-14 lg:top-[60px] z-40",
        "bg-white/85 backdrop-blur-md border-y border-border/60"
      )}
    >
      <div className="container-page flex items-center gap-2 h-14 overflow-x-auto scrollbar-hide">
        {/* LEFT: Все фильтры + quick popovers */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className={cn(
            "shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium transition-colors",
            activeCount > 0
              ? "bg-ink text-white"
              : "border border-ink/15 text-ink hover:bg-surface"
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Все фильтры
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white text-ink text-[11px] font-semibold tabular-nums">
              {activeCount}
            </span>
          )}
        </button>

        <QuickPricePopover
          min={facetOptions.priceMin}
          max={facetOptions.priceMax}
          value={{ min: filters.priceMin, max: filters.priceMax }}
          onApply={({ min, max }) =>
            onSetFilters({ ...filters, priceMin: min, priceMax: max })
          }
        />

        {config.quickFacets.map(renderQuickFacet)}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 text-[13px] text-ink-muted hover:text-ink transition-colors"
          >
            <X className="size-3.5" aria-hidden />
            Сбросить
          </button>
        )}

        <div className="flex-1" aria-hidden />

        {/* RIGHT: Sort only */}
        <Menu.Root>
          <Menu.Trigger
            nativeButton
            render={(props) => (
              <button
                {...props}
                type="button"
                className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface text-ink text-[13px] font-medium hover:bg-border/60 transition-colors"
              >
                <ArrowUpDown className="size-3.5 text-ink-subtle" aria-hidden />
                {SORT_LABELS[sort]}
                <ChevronDown className="size-3.5 opacity-70" aria-hidden />
              </button>
            )}
          />
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} align="end" className="z-[60]">
              <Menu.Popup
                className={cn(
                  "min-w-[220px] rounded-2xl bg-white border border-border/60 p-1.5",
                  "shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
                  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                  "transition-opacity duration-150"
                )}
              >
                {config.sortOptions.map((s) => (
                  <Menu.Item
                    key={s}
                    nativeButton
                    render={(props) => (
                      <button
                        {...props}
                        type="button"
                        onClick={() => onSetSort(s)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface data-[highlighted]:bg-surface outline-none cursor-pointer text-left"
                      >
                        {SORT_LABELS[s]}
                        {sort === s && (
                          <Check className="size-4 text-ink" aria-hidden />
                        )}
                      </button>
                    )}
                  />
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </div>
  );
}
