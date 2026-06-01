import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { FilterFacet, CategoryConfig } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory, getCategories, getProductCountsByCategory } from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { jsonLdScript } from "@/lib/utils/json-ld";
import { sanitizeRichHtml } from "@/lib/utils/sanitize-html";

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
  const canonical = `/category/${slug}`;
  // meta_title (если задан в админке) — абсолютный, чтобы не было двойного бренда;
  // иначе коммерческий фолбэк с городом + шаблонный «· PhoneTrade».
  const fallbackTitle = `${meta.title} в Белгороде — купить с гарантией`;
  const title: Metadata["title"] = meta.meta_title?.trim() ? { absolute: meta.meta_title.trim() } : fallbackTitle;
  const description =
    meta.meta_description?.trim() ||
    meta.description?.trim() ||
    `${meta.title} в Белгороде: купить с гарантией, доставка по городу и самовывоз, Trade-in и рассрочка. PhoneTrade — ул. Попова, 36.`;
  const ogTitle = meta.meta_title?.trim() || `${fallbackTitle} · PhoneTrade`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: ogTitle, description, url: canonical, type: "website" },
  };
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

  // Фасеты строго из админки (categories.available_filters). Нет настройки → нет фильтров.
  const facets: FilterFacet[] = ((meta?.available_filters ?? []).filter((f) => KNOWN_FACETS.has(f)) as FilterFacet[]);

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

  // BreadcrumbList для сниппета
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru";
  const crumbs = [
    { name: "Главная", url: `${base}/` },
    ...(breadcrumbParent ? [{ name: breadcrumbParent.title, url: `${base}${breadcrumbParent.href}` }] : []),
    { name: title, url: `${base}/category/${slug}` },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${title} в Белгороде`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 50).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/product/${p.id}`, name: p.title })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbLd, itemListLd]) }} />
      <CatalogShell
        config={config}
        products={products}
        facetOptions={facetOptions}
        seoHtml={meta?.seo_text ? sanitizeRichHtml(meta.seo_text) : null}
        tabs={tabs}
        breadcrumbParent={breadcrumbParent}
      />
    </>
  );
}
