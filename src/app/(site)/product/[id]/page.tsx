import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductById,
  getRelatedProducts,
  getVariantsForProduct,
} from "@/lib/products";
import { getProductBlocks } from "@/lib/content";
import { ProductDetailShell } from "@/components/product-detail/ProductDetailShell";

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

  return (
    <ProductDetailShell
      product={product}
      related={related}
      variants={variants}
      productBlocks={productBlocks}
    />
  );
}
