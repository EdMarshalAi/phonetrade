import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type {
  FilterFacet,
  CategoryConfig,
  SortKey,
} from "@/lib/catalog/category-config";
import { applySort, extractFacetOptions } from "@/lib/catalog/filters";
import {
  getProductsByCategory,
  getCategories,
  getProductCountsByCategory,
} from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { sanitizeRichHtml } from "@/lib/utils/sanitize-html";
import { jsonLdScript } from "@/lib/utils/json-ld";
import {
  CATALOG_PAGE_SIZE,
  pagePath,
  slicePage,
  totalPages,
} from "@/lib/catalog/pagination";

const ALL_FACETS: FilterFacet[] = [
  "model",
  "memory",
  "color",
  "sim",
  "condition",
  "battery",
];
const QUICK_FACETS: FilterFacet[] = ["color", "battery"];
const KNOWN_FACETS = new Set<string>(ALL_FACETS);
const BASE_PATH = "/used";

const getUsedCore = cache(async () => {
  const [products, meta] = await Promise.all([
    getProductsByCategory("used"),
    getCategoryMeta("used"),
  ]);
  return { products, meta };
});

export async function usedListingMetadata({
  currentPage,
  isFaceted,
}: {
  currentPage: number;
  isFaceted: boolean;
}): Promise<Metadata> {
  const { products, meta } = await getUsedCore();
  const pageCount = totalPages(products.length);
  if (
    currentPage > 1 &&
    (pageCount === 0 || currentPage > pageCount)
  ) {
    notFound();
  }

  const baseTitle =
    meta?.meta_title?.trim() ||
    meta?.title ||
    "Б/У iPhone в Белгороде — с гарантией";
  const title: Metadata["title"] =
    currentPage > 1
      ? meta?.meta_title?.trim()
        ? { absolute: `${baseTitle} — страница ${currentPage}` }
        : `${baseTitle} — страница ${currentPage}`
      : meta?.meta_title?.trim()
        ? { absolute: baseTitle }
        : baseTitle;
  const baseDescription =
    meta?.meta_description?.trim() ||
    meta?.description?.trim() ||
    "Б/У iPhone и техника Apple в Белгороде: проверенные устройства с гарантией, Trade-in и рассрочка. PhoneTrade — ул. Попова, 36.";
  const description =
    currentPage > 1
      ? `${baseDescription} Страница ${currentPage} из ${pageCount}.`
      : baseDescription;
  const canonical = pagePath(BASE_PATH, currentPage);

  return {
    title,
    description,
    alternates: { canonical },
    robots:
      isFaceted || (currentPage === 1 && products.length === 0)
        ? { index: false, follow: true }
        : undefined,
    pagination:
      pageCount > 1
        ? {
            previous:
              currentPage > 1
                ? pagePath(BASE_PATH, currentPage - 1)
                : undefined,
            next:
              currentPage < pageCount
                ? pagePath(BASE_PATH, currentPage + 1)
                : undefined,
          }
        : undefined,
    openGraph: {
      url: canonical,
      title:
        currentPage > 1
          ? `${baseTitle} — страница ${currentPage}`
          : baseTitle,
      description,
    },
  };
}

export async function UsedListing({
  currentPage,
  isFaceted,
}: {
  currentPage: number;
  isFaceted: boolean;
}) {
  const [{ products, meta }, allCategories, countsResult] =
    await Promise.all([
      getUsedCore(),
      getCategories().catch(() => []),
      getProductCountsByCategory()
        .then((counts) => ({ counts, available: true }))
        .catch(() => ({
          counts: {} as Record<string, number>,
          available: false,
        })),
    ]);

  const pageCount = totalPages(products.length);
  if (
    currentPage < 1 ||
    (currentPage > 1 && (pageCount === 0 || currentPage > pageCount))
  ) {
    notFound();
  }

  const title = meta?.title || "Б/У техника";
  const description =
    meta?.description ||
    "Проверенные Б/У устройства Apple с магазинной гарантией PhoneTrade.";
  const facets = (meta?.available_filters ?? []).filter((facet) =>
    KNOWN_FACETS.has(facet)
  ) as FilterFacet[];
  const defaultSort = (meta?.default_sort as SortKey) ?? "price-asc";
  const config: CategoryConfig = {
    slug: "used",
    title,
    description,
    facets,
    quickFacets: QUICK_FACETS.filter((facet) => facets.includes(facet)),
    sortOptions: [
      "popular",
      "price-asc",
      "price-desc",
      "new",
      "battery-desc",
    ],
  };

  const usedChildren = allCategories.filter(
    (category) =>
      category.parentSlug === "iphone-used" &&
      (!countsResult.available ||
        (countsResult.counts[category.slug] ?? 0) > 0)
  );
  const tabs =
    usedChildren.length > 0
      ? [
          {
            label: "Все Б/У",
            href: BASE_PATH,
            active: true,
            count: products.length,
          },
          ...usedChildren.map((category) => ({
            label: category.title,
            href: `/category/${category.slug}`,
            count: countsResult.counts[category.slug] ?? 0,
          })),
        ]
      : [];

  const facetOptions = extractFacetOptions(products, config.facets);
  const orderedProducts = applySort(products, defaultSort);
  const visibleProducts = slicePage(
    orderedProducts,
    currentPage,
    CATALOG_PAGE_SIZE
  );
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru"
  ).replace(/\/$/, "");
  const canonical = pagePath(BASE_PATH, currentPage);
  const crumbs = [
    { name: "Главная", url: `${siteUrl}/` },
    { name: "Б/У техника", url: `${siteUrl}${BASE_PATH}` },
    ...(currentPage > 1
      ? [
          {
            name: `Страница ${currentPage}`,
            url: `${siteUrl}${canonical}`,
          },
        ]
      : []),
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${title} в Белгороде`,
    numberOfItems: products.length,
    itemListElement: visibleProducts.map((product, index) => ({
      "@type": "ListItem",
      position:
        (currentPage - 1) * CATALOG_PAGE_SIZE + index + 1,
      url: `${siteUrl}/product/${product.id}`,
      name: product.title,
      ...(product.image ? { image: product.image } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd,
            ...(!isFaceted ? [itemListLd] : []),
          ]),
        }}
      />
      <CatalogShell
        config={config}
        products={products}
        facetOptions={facetOptions}
        seoHtml={
          currentPage === 1 && meta?.seo_text
            ? sanitizeRichHtml(meta.seo_text)
            : null
        }
        tabs={tabs}
        defaultSort={defaultSort}
        basePath={BASE_PATH}
        currentPage={currentPage}
        pageSize={CATALOG_PAGE_SIZE}
      />
    </>
  );
}
