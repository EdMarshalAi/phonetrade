import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryConfig, type FilterFacet } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory } from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";

export const dynamic = "force-dynamic";

const KNOWN_FACETS: FilterFacet[] = ["model", "memory", "color", "sim", "condition", "battery"];

export async function generateMetadata(): Promise<Metadata> {
  const config = getCategoryConfig("used");
  if (!config) return {};
  return { title: config.title, description: config.description };
}

export default async function UsedPage() {
  const config = getCategoryConfig("used");
  if (!config) notFound();

  const [products, meta] = await Promise.all([
    getProductsByCategory("used"),
    getCategoryMeta("used"),
  ]);

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
