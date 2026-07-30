import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import type {
  FilterFacet,
  CategoryConfig,
  SortKey,
} from "@/lib/catalog/category-config";
import { categoryFaq } from "@/lib/catalog/category-faq";
import { applySort, extractFacetOptions } from "@/lib/catalog/filters";
import {
  getProductsByCategory,
  getCategories,
  getProductCountsByCategory,
} from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { jsonLdScript } from "@/lib/utils/json-ld";
import { sanitizeRichHtml } from "@/lib/utils/sanitize-html";
import { categoryPath } from "@/lib/catalog/category-path";
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
const QUICK_FACETS: FilterFacet[] = ["color", "memory"];
const KNOWN_FACETS = new Set<string>(ALL_FACETS);
const OG_IMAGE =
  "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content/store-belgorod.jpg";

const getCategoryCore = cache(async (slug: string) => {
  const [meta, products] = await Promise.all([
    getCategoryMeta(slug),
    getProductsByCategory(slug as CategoryConfig["slug"]),
  ]);
  return { meta, products };
});

export async function categoryListingMetadata({
  slug,
  currentPage,
  isFaceted,
}: {
  slug: string;
  currentPage: number;
  isFaceted: boolean;
}): Promise<Metadata> {
  const { meta, products } = await getCategoryCore(slug);
  if (!meta) return {};

  const basePath = `/category/${slug}`;
  const canonical = pagePath(basePath, currentPage);
  const pageCount = totalPages(products.length);
  if (
    currentPage > 1 &&
    (pageCount === 0 || currentPage > pageCount)
  ) {
    notFound();
  }

  const fallbackTitle = `${meta.title} в Белгороде — купить с гарантией`;
  const baseTitle = meta.meta_title?.trim() || fallbackTitle;
  const title: Metadata["title"] =
    currentPage > 1
      ? meta.meta_title?.trim()
        ? { absolute: `${baseTitle} — страница ${currentPage}` }
        : `${baseTitle} — страница ${currentPage}`
      : meta.meta_title?.trim()
        ? { absolute: baseTitle }
        : fallbackTitle;
  const baseDescription =
    meta.meta_description?.trim() ||
    meta.description?.trim() ||
    `${meta.title} в Белгороде: купить с гарантией, доставка по городу и самовывоз, Trade-in и рассрочка. PhoneTrade — ул. Попова, 36.`;
  const description =
    currentPage > 1
      ? `${baseDescription} Страница ${currentPage} из ${pageCount}.`
      : baseDescription;
  const ogTitle =
    currentPage > 1
      ? `${baseTitle} — страница ${currentPage}`
      : meta.meta_title?.trim() || `${fallbackTitle} · PhoneTrade`;

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
                ? pagePath(basePath, currentPage - 1)
                : undefined,
            next:
              currentPage < pageCount
                ? pagePath(basePath, currentPage + 1)
                : undefined,
          }
        : undefined,
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      type: "website",
      images: [
        {
          url: OG_IMAGE,
          width: 1400,
          height: 1400,
          alt: `${meta.title} — PhoneTrade Белгород`,
        },
      ],
    },
  };
}

export async function CategoryListing({
  slug,
  currentPage,
  isFaceted,
}: {
  slug: string;
  currentPage: number;
  isFaceted: boolean;
}) {
  const [{ meta, products }, allCategories, countsState] = await Promise.all([
    getCategoryCore(slug),
    getCategories().catch(() => []),
    getProductCountsByCategory()
      .then((counts) => ({ counts, available: true }))
      .catch(() => ({
        counts: {} as Record<string, number>,
        available: false,
      })),
  ]);
  const { counts } = countsState;

  const cat = allCategories.find((category) => category.slug === slug);
  if (!meta && !cat) notFound();

  const pageCount = totalPages(products.length);
  if (
    currentPage < 1 ||
    (currentPage > 1 && (pageCount === 0 || currentPage > pageCount))
  ) {
    notFound();
  }

  const title = meta?.title || cat?.title || slug;
  const description =
    meta?.description ||
    cat?.subtitle ||
    `${title} — с гарантией PhoneTrade в Белгороде.`;
  const facets = (meta?.available_filters ?? []).filter((facet) =>
    KNOWN_FACETS.has(facet)
  ) as FilterFacet[];
  const defaultSort = (meta?.default_sort as SortKey) ?? "price-asc";

  const config: CategoryConfig = {
    slug: slug as CategoryConfig["slug"],
    title,
    description,
    facets,
    quickFacets: QUICK_FACETS.filter((facet) => facets.includes(facet)),
    sortOptions: ["popular", "price-asc", "price-desc", "new"],
  };

  const railParentSlug = cat?.parentSlug ?? slug;
  const railParent = allCategories.find(
    (category) => category.slug === railParentSlug
  );
  const children = allCategories.filter(
    (category) =>
      category.parentSlug === railParentSlug &&
      (!countsState.available || (counts[category.slug] ?? 0) > 0)
  );
  const childTotal = children.reduce(
    (sum, child) => sum + (counts[child.slug] ?? 0),
    0
  );
  const tabs =
    children.length > 0 && railParent
      ? [
          {
            label: `Все ${railParent.title}`,
            href: categoryPath(railParent.slug),
            active: slug === railParent.slug,
            count: (counts[railParent.slug] ?? 0) + childTotal,
          },
          ...children.map((child) => ({
            label: child.title,
            href: categoryPath(child.slug),
            active: slug === child.slug,
            count: counts[child.slug] ?? 0,
          })),
        ]
      : [];
  const breadcrumbParent =
    cat?.parentSlug && railParent
      ? {
          title: railParent.title,
          href: categoryPath(railParent.slug),
        }
      : null;

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
  const basePath = `/category/${slug}`;
  const canonical = pagePath(basePath, currentPage);
  const crumbs = [
    { name: "Главная", url: `${siteUrl}/` },
    ...(breadcrumbParent
      ? [
          {
            name: breadcrumbParent.title,
            url: `${siteUrl}${breadcrumbParent.href}`,
          },
        ]
      : []),
    { name: title, url: `${siteUrl}${basePath}` },
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
  const faq = categoryFaq(title);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "ru",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      inLanguage: "ru",
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const structuredData = [
    breadcrumbLd,
    ...(!isFaceted ? [itemListLd] : []),
    ...(currentPage === 1 ? [faqLd] : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(structuredData),
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
        breadcrumbParent={breadcrumbParent}
        defaultSort={defaultSort}
        basePath={basePath}
        currentPage={currentPage}
        pageSize={CATALOG_PAGE_SIZE}
      />
      {currentPage === 1 ? (
        <section className="container-page pb-16 md:pb-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              Частые вопросы
            </h2>
            <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-white">
              {faq.map((item) => (
                <details key={item.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
                    {item.q}
                    <ChevronDown
                      className="size-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
