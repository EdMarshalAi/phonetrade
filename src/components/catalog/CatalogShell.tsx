"use client";

import * as React from "react";
import Link from "next/link";
import type { CategoryConfig, SortKey } from "@/lib/catalog/category-config";
import type { FacetOptions } from "@/lib/catalog/filters";
import {
  applyFilters,
  applySort,
  countActiveFilters,
} from "@/lib/catalog/filters";
import { useCatalogFilters } from "@/lib/catalog/use-catalog-filters";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { QuickFilterBar } from "@/components/catalog/QuickFilterBar";
import { ActiveFilterChips } from "@/components/catalog/ActiveFilterChips";
import { FilterDrawer } from "@/components/catalog/FilterDrawer";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { CatalogSeo } from "@/components/catalog/CatalogSeo";
import type { Product } from "@/lib/data/products";

type Props = {
  config: CategoryConfig;
  products: Product[];
  facetOptions: FacetOptions;
  /** SEO-блок (HTML) из админки. Если задан — заменяет config.seo. */
  seoHtml?: string | null;
  /** Чипы-вкладки подкатегорий (показываются одинаково на родителе и детях). */
  tabs?: { label: string; href: string; active?: boolean; count?: number }[];
  /** Родитель для хлебных крошек (если текущая категория — подкатегория). */
  breadcrumbParent?: { title: string; href: string } | null;
  /** Базовая сортировка категории (из админки). По умолчанию — дешёвые сначала. */
  defaultSort?: SortKey;
};

const PAGE_SIZE = 12;

export function CatalogShell({ config, products, facetOptions, seoHtml, tabs = [], breadcrumbParent = null, defaultSort = "price-asc" }: Props) {
  const { filters, sort, setSort, toggleValue, reset, setFilters } =
    useCatalogFilters(defaultSort);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Pagination kept in component state so a page reload always shows the
  // first PAGE_SIZE products instead of all loaded ones from URL history.
  const [shown, setShown] = React.useState(PAGE_SIZE);

  const filteredAndSorted = React.useMemo(() => {
    const filtered = applyFilters(products, filters);
    return applySort(filtered, sort);
  }, [products, filters, sort]);

  // Whenever filters or sort change, restart from the first page.
  React.useEffect(() => {
    setShown(PAGE_SIZE);
  }, [filters, sort]);

  const visible = filteredAndSorted.slice(0, shown);
  const hasMore = visible.length < filteredAndSorted.length;
  const activeCount = countActiveFilters(filters);

  return (
    <>
      <CatalogHero
        title={config.title}
        description={config.description}
        total={filteredAndSorted.length}
        parent={breadcrumbParent}
      />

      {tabs.length > 0 && (
        <section className="bg-bg">
          <div className="container-page pb-2 pt-1">
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={t.active ? "page" : undefined}
                  className={
                    t.active
                      ? "inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-white"
                      : "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-4 py-2 text-[13.5px] font-medium text-ink transition-colors hover:border-ink/40 hover:bg-surface"
                  }
                >
                  {t.label}
                  {t.count != null ? (
                    <span className={t.active ? "text-white/60 tabular-nums" : "text-ink-subtle tabular-nums"}>{t.count}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <QuickFilterBar
        config={config}
        facetOptions={facetOptions}
        filters={filters}
        sort={sort}
        activeCount={activeCount}
        onToggle={toggleValue}
        onSetSort={setSort}
        onOpenDrawer={() => setDrawerOpen(true)}
        onReset={reset}
        onSetFilters={setFilters}
      />

      <section className="bg-bg">
        <div className="container-page pt-6 pb-20 md:pb-28">
          {activeCount > 0 && (
            <ActiveFilterChips
              filters={filters}
              onToggle={toggleValue}
              onReset={reset}
            />
          )}

          <ProductGrid
            products={visible}
            total={filteredAndSorted.length}
            hasMore={hasMore}
            pageSize={PAGE_SIZE}
            onLoadMore={() =>
              setShown((s) =>
                Math.min(s + PAGE_SIZE, filteredAndSorted.length)
              )
            }
          />

          {seoHtml ? (
            <CatalogSeo blocks={[{ html: seoHtml }]} />
          ) : config.seo && config.seo.length > 0 ? (
            <CatalogSeo blocks={config.seo} />
          ) : null}
        </div>
      </section>

      <FilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        config={config}
        facetOptions={facetOptions}
        filters={filters}
        onToggle={toggleValue}
        onApply={() => setDrawerOpen(false)}
        onReset={() => {
          reset();
          setDrawerOpen(false);
        }}
        onSetFilters={setFilters}
      />
    </>
  );
}
