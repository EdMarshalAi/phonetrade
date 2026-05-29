import * as React from "react";
import type { Product } from "@/lib/data/products";
import { ProductBreadcrumbs } from "@/components/product-detail/ProductBreadcrumbs";
import { ProductGallery } from "@/components/product-detail/ProductGallery";
import { ProductBuyPanel } from "@/components/product-detail/ProductBuyPanel";
import { ProductTrust } from "@/components/product-detail/ProductTrust";
import { ProductRelated } from "@/components/product-detail/ProductRelated";
import { ProductDescription } from "@/components/product-detail/ProductDescription";

type Props = {
  product: Product;
  related: Product[];
  variants: { colors: Product[]; memories: Product[] };
};

export function ProductDetailShell({ product, related, variants }: Props) {
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
            <ProductTrust product={product} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-surface border-t border-border/60">
          <div className="container-page py-14 md:py-20">
            <ProductRelated products={related} />
          </div>
        </section>
      )}

      {product.description && product.description.length > 0 && (
        <section className="bg-bg">
          <div className="container-page py-14 md:py-20">
            <ProductDescription
              blocks={product.description}
              productTitle={product.title}
            />
          </div>
        </section>
      )}
    </>
  );
}
