import type { Metadata } from "next";
import type { FilterFacet, CategoryConfig } from "@/lib/catalog/category-config";
import { extractFacetOptions } from "@/lib/catalog/filters";
import { getProductsByCategory, getCategories, getProductCountsByCategory } from "@/lib/products";
import { getCategoryMeta } from "@/lib/content";
import { CatalogShell } from "@/components/catalog/CatalogShell";

export const dynamic = "force-dynamic";

// «Б/У» — виртуальная коллекция всех товаров type='used'. Настройки (название,
// описание, фильтры, SEO) берутся из категории-строки `used` в админке, если она
// заведена; иначе — разумный дефолт. Хардкода нет.
const ALL_FACETS: FilterFacet[] = ["model", "memory", "color", "sim", "condition", "battery"];
const QUICK_FACETS: FilterFacet[] = ["color", "battery"];
const KNOWN_FACETS = new Set<string>(ALL_FACETS);

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getCategoryMeta("used");
  return {
    title: meta?.meta_title?.trim() ? { absolute: meta.meta_title.trim() } : (meta?.title || "Б/У iPhone в Белгороде — с гарантией"),
    description:
      meta?.meta_description?.trim() ||
      meta?.description?.trim() ||
      "Б/У iPhone и техника Apple в Белгороде: проверенные устройства с гарантией, Trade-in и рассрочка. PhoneTrade — ул. Попова, 36.",
    alternates: { canonical: "/used" },
    openGraph: { url: "/used" },
  };
}

export default async function UsedPage() {
  const [products, meta, allCategories, counts] = await Promise.all([
    getProductsByCategory("used"),
    getCategoryMeta("used"),
    getCategories().catch(() => []),
    getProductCountsByCategory().catch(() => ({} as Record<string, number>)),
  ]);

  const title = meta?.title || "Б/У техника";
  const description = meta?.description || "Проверенные Б/У устройства Apple с магазинной гарантией PhoneTrade.";
  // Фасеты строго из админки (категория `used`). Нет настройки → нет фильтров.
  const facets: FilterFacet[] = ((meta?.available_filters ?? []).filter((f) => KNOWN_FACETS.has(f)) as FilterFacet[]);

  const config: CategoryConfig = {
    slug: "used",
    title,
    description,
    facets,
    quickFacets: QUICK_FACETS.filter((f) => facets.includes(f)),
    sortOptions: ["popular", "price-asc", "price-desc", "new", "battery-desc"],
  };

  // Чипы: «Все Б/У» (активно) + категории Б/У из БД (дети iphone-used) с количеством.
  const usedChildren = allCategories.filter((c) => c.parentSlug === "iphone-used");
  const tabs =
    usedChildren.length > 0
      ? [
          { label: "Все Б/У", href: "/used", active: true, count: products.length },
          ...usedChildren.map((c) => ({ label: c.title, href: `/category/${c.slug}`, count: counts[c.slug] ?? 0 })),
        ]
      : [];

  const facetOptions = extractFacetOptions(products, config.facets);

  const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Б/У техника", item: `${SITE_URL}/used` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <CatalogShell
        config={config}
        products={products}
        facetOptions={facetOptions}
        seoHtml={meta?.seo_text ?? null}
        tabs={tabs}
      />
    </>
  );
}
