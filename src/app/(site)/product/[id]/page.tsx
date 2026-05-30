import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductById,
  getRelatedProducts,
  getVariantsForProduct,
} from "@/lib/products";
import { getProductBlocks } from "@/lib/content";
import { ProductDetailShell } from "@/components/product-detail/ProductDetailShell";
import { productImages } from "@/lib/utils/product-images";

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return {};
  return {
    title: product.title,
    description: product.highlights?.[0] ?? `Купить ${product.title} в Белгороде с гарантией PhoneTrade.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const [related, variants, productBlocks] = await Promise.all([
    getRelatedProducts(product, 8),
    getVariantsForProduct(product),
    getProductBlocks(),
  ]);

  // Schema.org Product (JSON-LD) — расширенные сниппеты в поиске.
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://31.129.97.8";
  const inStock = product.stock == null || product.stock > 0;
  const brandName = /samsung/i.test(product.title) ? "Samsung" : /яндекс|station|станц/i.test(product.title) ? "Яндекс" : /sony|playstation|dualsense/i.test(product.title) ? "Sony" : "Apple";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: productImages(product),
    description: `${product.title} — купить в Белгороде в PhoneTrade: гарантия, доставка и самовывоз.`,
    sku: product.id,
    brand: { "@type": "Brand", name: brandName },
    offers: {
      "@type": "Offer",
      url: `${base}/product/${product.id}`,
      priceCurrency: "RUB",
      price: product.priceCash ?? undefined,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      itemCondition: product.isUsed ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "PhoneTrade" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetailShell
        product={product}
        related={related}
        variants={variants}
        productBlocks={productBlocks}
      />
    </>
  );
}
