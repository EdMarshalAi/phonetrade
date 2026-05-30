import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { FilterFacet, CategoryConfig } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory, getCategories, getProductCountsByCategory } from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";

// Единый список фасетов; конкретный набор берётся из настроек категории
// (categories.available_filters) в админке. Хардкода по слагу больше нет.
const ALL_FACETS: FilterFacet[] = ["model", "memory", "color", "sim", "condition", "battery"];
const QUICK_FACETS: FilterFacet[] = ["color", "memory"];
const KNOWN_FACETS = new Set<string>(ALL_FACETS);

type RouteParams = { slug: string };

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getCategoryMeta(slug);
  if (!meta) return {};
  return { title: meta.title, description: meta.description ?? undefined };
}

export default async function CategoryPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;

  const [meta, allCategories, products, counts] = await Promise.all([
    getCategoryMeta(slug),
    getCategories().catch(() => []),
    getProductsByCategory(slug as CategoryConfig["slug"]),
    getProductCountsByCategory().catch(() => ({} as Record<string, number>)),
  ]);

  const cat = allCategories.find((c) => c.slug === slug);
  if (!meta && !cat) notFound();

  const title = meta?.title || cat?.title || slug;
  const description = meta?.description || cat?.subtitle || `${title} — с гарантией PhoneTrade в Белгороде.`;

  // Фасеты: из админки (available_filters) или весь набор по умолчанию
  const facets: FilterFacet[] =
    meta?.available_filters && meta.available_filters.length > 0
      ? (meta.available_filters.filter((f) => KNOWN_FACETS.has(f)) as FilterFacet[])
      : ALL_FACETS;

  const config: CategoryConfig = {
    slug: slug as CategoryConfig["slug"],
    title,
    description,
    facets,
    quickFacets: QUICK_FACETS.filter((f) => facets.includes(f)),
    sortOptions: ["popular", "price-asc", "price-desc", "new"],
  };

  // Единая навигация по подкатегориям из БД (parentSlug) с количеством товаров.
  const railParentSlug = cat?.parentSlug ?? slug;
  const railParent = allCategories.find((c) => c.slug === railParentSlug);
  const children = allCategories.filter((c) => c.parentSlug === railParentSlug);
  const childTotal = children.reduce((s, c) => s + (counts[c.slug] ?? 0), 0);
  const tabs =
    children.length > 0 && railParent
      ? [
          {
            label: `Все ${railParent.title}`,
            href: `/category/${railParent.slug}`,
            active: slug === railParent.slug,
            count: (counts[railParent.slug] ?? 0) + childTotal,
          },
          ...children.map((c) => ({
            label: c.title,
            href: `/category/${c.slug}`,
            active: slug === c.slug,
            count: counts[c.slug] ?? 0,
          })),
        ]
      : [];
  const breadcrumbParent =
    cat?.parentSlug && railParent ? { title: railParent.title, href: `/category/${railParent.slug}` } : null;

  const facetOptions = extractFacetOptions(products, config.facets);

  return (
    <CatalogShell
      config={config}
      products={products}
      facetOptions={facetOptions}
      seoHtml={meta?.seo_text ?? null}
      tabs={tabs}
      breadcrumbParent={breadcrumbParent}
    />
  );
}
