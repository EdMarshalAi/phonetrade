import * as React from "react";
import Link from "next/link";
import type { Product } from "@/lib/data/products";
import type { InfoBlock } from "@/lib/content";
import { ProductBreadcrumbs } from "@/components/product-detail/ProductBreadcrumbs";
import { ProductGallery } from "@/components/product-detail/ProductGallery";
import { ProductBuyPanel } from "@/components/product-detail/ProductBuyPanel";
import { ProductTrust } from "@/components/product-detail/ProductTrust";
import { ProductRelated } from "@/components/product-detail/ProductRelated";
import { ProductDescription } from "@/components/product-detail/ProductDescription";
import { sanitizeRichHtml } from "@/lib/utils/sanitize-html";

type Props = {
  product: Product;
  related: Product[];
  variants: { colors: Product[]; memories: Product[]; sims: Product[] };
  productBlocks: InfoBlock[];
};

export function ProductDetailShell({ product, related, variants, productBlocks }: Props) {
  return (
    <>
      <section className="bg-bg">
        <div className="container-page pt-8 md:pt-10 pb-12 md:pb-16">
          <ProductBreadcrumbs product={product} />

          <h1 className="mt-3 mb-8 md:mb-10 text-2xl md:text-4xl font-semibold tracking-[-0.03em] text-ink max-w-4xl">
            {product.title}
          </h1>

          <div className="grid gap-8 lg:gap-12 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <ProductGallery product={product} />
            </div>
            <div className="lg:col-span-5">
              <ProductBuyPanel product={product} variants={variants} />
            </div>
          </div>

          <div className="mt-10 md:mt-14">
            <ProductTrust blocks={productBlocks} />
          </div>

          {/* Перелинковка на money-страницы (T23): ремонт, Trade-in, категория, Б/У */}
          <nav aria-label="Полезное" className="mt-8 flex flex-wrap gap-2 text-[13px]">
            {[
              { href: "/repair", label: "Ремонт техники Apple" },
              { href: "/trade-in", label: "Trade-in — обмен с доплатой" },
              ...(product.categorySlug ? [{ href: `/category/${product.categorySlug}`, label: "Смотреть всю категорию" }] : []),
              ...(!product.isUsed && /iphone/i.test(product.categorySlug ?? "") ? [{ href: "/used", label: "Б/У iPhone" }] : []),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-border/60 bg-white px-4 py-1.5 text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-surface border-t border-border/60">
          <div className="container-page py-14 md:py-20">
            <ProductRelated products={related} />
          </div>
        </section>
      )}

      {product.descriptionHtml && product.descriptionHtml.trim().length > 0 ? (
        <section className="bg-bg border-t border-border/60">
          <div className="container-page py-14 md:py-20">
            {/* Полное описание — тот же стиль, что SEO-блок категории: на всю ширину, в рамке */}
            <section
              aria-label="Описание товара"
              className="rounded-3xl bg-white border border-border/60 p-7 md:p-12"
            >
              <article
                className="prose prose-neutral max-w-none prose-headings:text-ink prose-headings:font-semibold prose-headings:tracking-[-0.01em] prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-0 prose-h2:mb-4 prose-h3:text-lg md:prose-h3:text-xl prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-ink-muted prose-li:text-[15px] prose-li:leading-relaxed prose-li:text-ink-muted prose-a:text-ink prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-strong:text-ink prose-strong:font-semibold prose-table:text-sm prose-th:text-ink prose-td:text-ink-muted prose-hr:border-border/60"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.descriptionHtml) }}
              />
            </section>
          </div>
        </section>
      ) : product.description && product.description.length > 0 ? (
        <section className="bg-bg">
          <div className="container-page py-14 md:py-20">
            <ProductDescription
              blocks={product.description}
              productTitle={product.title}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
