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
import {
  CATALOG_PAGE_SIZE,
  slicePage,
  totalPages,
} from "@/lib/catalog/pagination";

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
  /** Канонический путь коллекции без фильтров и номера страницы. */
  basePath: string;
  /** Номер crawlable path-страницы. Фильтры всегда возвращают на страницу 1. */
  currentPage?: number;
  pageSize?: number;
};

export function CatalogShell({
  config,
  products,
  facetOptions,
  seoHtml,
  tabs = [],
  breadcrumbParent = null,
  defaultSort = "price-asc",
  basePath,
  currentPage = 1,
  pageSize = CATALOG_PAGE_SIZE,
}: Props) {
  const { filters, sort, setSort, toggleValue, reset, setFilters } =
    useCatalogFilters(defaultSort, basePath);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Отфильтрованный режим остаётся клиентским и сохраняет привычный load-more.
  // Обычный каталог использует отдельные crawlable path-страницы.
  const viewKey = JSON.stringify([filters, sort, currentPage, pageSize]);
  const [shownState, setShownState] = React.useState(() => ({
    key: viewKey,
    count: pageSize,
  }));
  const shown =
    shownState.key === viewKey ? shownState.count : pageSize;

  const filteredAndSorted = React.useMemo(() => {
    const filtered = applyFilters(products, filters);
    return applySort(filtered, sort);
  }, [products, filters, sort]);

  const activeCount = countActiveFilters(filters);
  const isCanonicalView = activeCount === 0 && sort === defaultSort;
  const pageCount = totalPages(filteredAndSorted.length, pageSize);
  const visible = isCanonicalView
    ? slicePage(filteredAndSorted, currentPage, pageSize)
    : filteredAndSorted.slice(0, shown);
  const hasMore =
    !isCanonicalView && visible.length < filteredAndSorted.length;

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
            pageSize={pageSize}
            onLoadMore={() =>
              setShownState((state) => ({
                key: viewKey,
                count: Math.min(
                  (state.key === viewKey ? state.count : pageSize) +
                    pageSize,
                  filteredAndSorted.length
                ),
              }))
            }
            pagination={
              isCanonicalView
                ? {
                    basePath,
                    currentPage,
                    totalPages: pageCount,
                  }
                : undefined
            }
          />

          {currentPage === 1 && seoHtml ? (
            <CatalogSeo blocks={[{ html: seoHtml }]} />
          ) : currentPage === 1 && config.seo && config.seo.length > 0 ? (
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
