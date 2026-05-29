import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryConfig, type FilterFacet } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory } from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";

const KNOWN_FACETS: FilterFacet[] = ["model", "memory", "color", "sim", "condition", "battery"];

type RouteParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategoryConfig(slug);
  if (!config) return {};
  return { title: config.title, description: config.description };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const config = getCategoryConfig(slug);
  if (!config) notFound();

  const [products, meta] = await Promise.all([
    getProductsByCategory(config.slug),
    getCategoryMeta(slug),
  ]);

  // Фильтры категории: из админки (categories.available_filters) или фолбэк на код-конфиг.
  const enabledFacets =
    meta?.available_filters && meta.available_filters.length > 0
      ? (meta.available_filters.filter((f): f is FilterFacet =>
          (KNOWN_FACETS as string[]).includes(f)
        ) as FilterFacet[])
      : config.facets;
  const effectiveConfig = {
    ...config,
    facets: enabledFacets,
    quickFacets: config.quickFacets.filter((f) => enabledFacets.includes(f)),
  };

  const facetOptions = extractFacetOptions(products, effectiveConfig.facets);

  return (
    <CatalogShell
      config={effectiveConfig}
      products={products}
      facetOptions={facetOptions}
      seoHtml={meta?.seo_text ?? null}
    />
  );
}
