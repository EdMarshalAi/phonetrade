import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getCategoryConfig } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory } from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
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

  const [products, meta] = await Promise.all([
    getProductsByCategory(config.slug),
    getCategoryMeta(slug),
  ]);
  const facetOptions = extractFacetOptions(products, config.facets);

  return (
    <>
      {meta?.icon_url ? (
        <div className="container-page pt-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white">
              <Image src={meta.icon_url} alt={meta.title} width={40} height={40} className="h-full w-full object-contain p-1" />
            </span>
            <span className="text-sm text-ink-muted">{meta.title}</span>
          </div>
        </div>
      ) : null}

      <CatalogShell config={config} products={products} facetOptions={facetOptions} />

      {meta?.seo_text ? (
        <section className="bg-surface">
          <div className="container-page py-12 md:py-16">
            <div className="prose prose-neutral max-w-3xl whitespace-pre-wrap text-ink-muted">{meta.seo_text}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
