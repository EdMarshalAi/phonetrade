import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getNewProducts } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";
import { PaginationNav } from "@/components/catalog/PaginationNav";
import { plural } from "@/lib/utils/plural";
import { jsonLdScript } from "@/lib/utils/json-ld";
import {
  CATALOG_PAGE_SIZE,
  pagePath,
  slicePage,
  totalPages,
} from "@/lib/catalog/pagination";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru"
).replace(/\/$/, "");
const BASE_PATH = "/new";
const BASE_TITLE = "Новинки Apple в Белгороде";
const BASE_DESCRIPTION =
  "Новинки и свежие поступления техники Apple в Белгороде: iPhone, Mac, iPad, Watch, AirPods. Гарантия, доставка и самовывоз — PhoneTrade, ул. Попова, 36.";

const getNewListingProducts = cache(() => getNewProducts());

export async function newListingMetadata(
  currentPage: number
): Promise<Metadata> {
  const products = await getNewListingProducts();
  const pageCount = totalPages(products.length);
  if (
    currentPage > 1 &&
    (pageCount === 0 || currentPage > pageCount)
  ) {
    notFound();
  }

  const canonical = pagePath(BASE_PATH, currentPage);
  const title =
    currentPage > 1
      ? `${BASE_TITLE} — страница ${currentPage}`
      : BASE_TITLE;
  const description =
    currentPage > 1
      ? `${BASE_DESCRIPTION} Страница ${currentPage} из ${pageCount}.`
      : BASE_DESCRIPTION;

  return {
    title,
    description,
    alternates: { canonical },
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
          ? `${BASE_TITLE} — страница ${currentPage} · PhoneTrade`
          : `${BASE_TITLE} · PhoneTrade`,
      description,
    },
  };
}

export async function NewListing({
  currentPage,
}: {
  currentPage: number;
}) {
  const products = await getNewListingProducts();
  const pageCount = totalPages(products.length);
  if (
    currentPage < 1 ||
    (currentPage > 1 && (pageCount === 0 || currentPage > pageCount))
  ) {
    notFound();
  }

  const pageProducts = slicePage(
    products,
    currentPage,
    CATALOG_PAGE_SIZE
  );
  const canonical = pagePath(BASE_PATH, currentPage);
  const crumbs = [
    { name: "Главная", url: `${SITE_URL}/` },
    { name: "Новинки", url: `${SITE_URL}${BASE_PATH}` },
    ...(currentPage > 1
      ? [
          {
            name: `Страница ${currentPage}`,
            url: `${SITE_URL}${canonical}`,
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
    name: "Новинки Apple в Белгороде",
    numberOfItems: products.length,
    itemListElement: pageProducts.map((product, index) => ({
      "@type": "ListItem",
      position:
        (currentPage - 1) * CATALOG_PAGE_SIZE + index + 1,
      url: `${SITE_URL}/product/${product.id}`,
      name: product.title,
      ...(product.image ? { image: product.image } : {}),
    })),
  };

  return (
    <section className="bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([breadcrumbLd, itemListLd]),
        }}
      />
      <div className="container-page pt-10 pb-20 md:pt-14 md:pb-28">
        <nav
          aria-label="Хлебные крошки"
          className="mb-4 flex items-center gap-1.5 text-xs text-ink-subtle"
        >
          <Link href="/" className="transition-colors hover:text-ink">
            Главная
          </Link>
          <span aria-hidden>/</span>
          {currentPage > 1 ? (
            <>
              <Link
                href={BASE_PATH}
                className="transition-colors hover:text-ink"
              >
                Новинки
              </Link>
              <span aria-hidden>/</span>
              <span className="text-ink">Страница {currentPage}</span>
            </>
          ) : (
            <span className="text-ink">Новинки</span>
          )}
        </nav>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink md:text-5xl">
            Новинки
          </h1>
          {products.length > 0 ? (
            <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">
              {products.length}{" "}
              {plural(products.length, ["модель", "модели", "моделей"])}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted md:text-base">
          Последние поступления Apple — свежие линейки iPhone, Mac, iPad и
          аксессуаров с гарантией PhoneTrade.
        </p>

        {products.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-white px-6 py-16 text-center">
            <p className="text-base font-medium text-ink">
              Пока нет товаров с пометкой «Новинка»
            </p>
            <p className="mt-1.5 max-w-md text-sm text-ink-muted">
              Загляните в полный каталог — там вся актуальная техника Apple.
            </p>
            <Link
              href="/catalog"
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {pageProducts.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} className="h-full" />
                </li>
              ))}
            </ul>
            <PaginationNav
              basePath={BASE_PATH}
              currentPage={currentPage}
              totalPages={pageCount}
            />
          </>
        )}
      </div>
    </section>
  );
}
