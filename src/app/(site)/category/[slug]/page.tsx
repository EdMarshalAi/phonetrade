import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryConfig, defaultCategoryConfig, type FilterFacet, type CategoryConfig } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory, getCategories } from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";

const KNOWN_FACETS: FilterFacet[] = ["model", "memory", "color", "sim", "condition", "battery"];

type RouteParams = { slug: string };

/** Базовый конфиг: хардкод для известных категорий, иначе — из категории в БД. */
async function resolveConfig(slug: string): Promise<CategoryConfig | null> {
  const hardcoded = getCategoryConfig(slug);
  if (hardcoded) return hardcoded;
  const categories = await getCategories().catch(() => []);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return null;
  return defaultCategoryConfig(slug, cat.title, cat.subtitle);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = await resolveConfig(slug);
  if (!config) return {};
  return { title: config.title, description: config.description };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const config = await resolveConfig(slug);
  if (!config) notFound();

  const [products, meta, allCategories] = await Promise.all([
    getProductsByCategory(config.slug),
    getCategoryMeta(slug),
    getCategories().catch(() => []),
  ]);
  const subcategories = allCategories
    .filter((c) => c.parentSlug === config.slug)
    .map((c) => ({ slug: c.slug, title: c.title }));

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
      subcategories={subcategories}
    />
  );
}
