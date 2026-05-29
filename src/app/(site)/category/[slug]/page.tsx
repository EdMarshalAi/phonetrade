import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryConfig } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory } from "@/lib/products";
import { CatalogShell } from "@/components/catalog/CatalogShell";

type RouteParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategoryConfig(slug);
  if (!config) return {};
  return {
    title: config.title,
    description: config.description,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const config = getCategoryConfig(slug);
  if (!config) notFound();

  const products = await getProductsByCategory(config.slug);
  const facetOptions = extractFacetOptions(products, config.facets);

  return (
    <CatalogShell
      config={config}
      products={products}
      facetOptions={facetOptions}
    />
  );
}
