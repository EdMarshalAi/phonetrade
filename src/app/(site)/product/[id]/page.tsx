import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductById,
  getRelatedProducts,
  getVariantsForProduct,
  getCategories,
  getAllowZeroStock,
} from "@/lib/products";
import { getProductBlocks } from "@/lib/content";
import { ProductDetailShell } from "@/components/product-detail/ProductDetailShell";
import { productImages } from "@/lib/utils/product-images";
import { jsonLdScript } from "@/lib/utils/json-ld";
import { faqFromHtml, faqPageLd } from "@/lib/utils/faq-schema";
import {
  resolveProductAvailability,
  resolveProductBrand,
  syncProductSeoContent,
} from "@/lib/product-commerce";
import { categoryPath } from "@/lib/catalog/category-path";

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return {};
  const title = product.metaTitle || `${product.title} — купить в Белгороде`;
  const description = syncProductSeoContent(
    product.metaDescription || product.shortDescription || `Купить ${product.title} в Белгороде с гарантией PhoneTrade.`,
    product.priceCash,
    product
  );
  const imgs = productImages(product);
  const canonical = `/product/${product.id}`;
  const indexable = product.isIndexable !== false;
  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: canonical, type: "website", images: imgs.length ? [imgs[0]] : undefined },
    twitter: { card: "summary_large_image", title, description, images: imgs.length ? [imgs[0]] : undefined },
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

  const [related, variants, productBlocks, allCats, allowZeroStock] = await Promise.all([
    getRelatedProducts(product, 8),
    getVariantsForProduct(product),
    getProductBlocks(),
    getCategories().catch(() => []),
    getAllowZeroStock(),
  ]);

  const syncedMetaDescription = syncProductSeoContent(product.metaDescription, product.priceCash, product);
  const syncedShortDescription = syncProductSeoContent(product.shortDescription, product.priceCash, product);
  const syncedDescriptionHtml = syncProductSeoContent(product.descriptionHtml, product.priceCash, product);
  const renderedProduct = {
    ...product,
    metaDescription: syncedMetaDescription || product.metaDescription,
    shortDescription: syncedShortDescription || product.shortDescription,
    descriptionHtml: syncedDescriptionHtml || product.descriptionHtml,
  };

  // Schema.org Product (JSON-LD) — расширенные сниппеты в поиске.
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
  const availability = resolveProductAvailability(product, allowZeroStock);
  const brandName = resolveProductBrand(product);
  const price = product.priceCash;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: productImages(product),
    // Уникальное описание (его читают LLM/сниппеты), не шаблон — фолбэк на гео-строку.
    description: syncedShortDescription || syncedMetaDescription || `${product.title} — купить в Белгороде в PhoneTrade: гарантия, доставка и самовывоз.`,
    sku: product.sku || product.id,
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    // Offer рендерим только при наличии цены (Offer без price/priceSpecification невалиден).
    ...(price && price > 0
      ? {
          offers: {
            "@type": "Offer",
            url: `${base}/product/${product.id}`,
            priceCurrency: "RUB",
            price,
            availability: availability.schemaAvailability,
            itemCondition: product.isUsed ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
            seller: { "@id": `${base}/#organization` },
          },
        }
      : {}),
  };

  // Хлебные крошки для сниппета: Главная > Каталог > [родитель] > Категория > Товар
  const cat = allCats.find((c) => c.slug === product.categorySlug);
  const parent = cat?.parentSlug ? allCats.find((c) => c.slug === cat.parentSlug) : null;
  const crumbs = [
    { name: "Главная", url: `${base}/` },
    { name: "Каталог", url: `${base}/catalog` },
    ...(parent ? [{ name: parent.title, url: `${base}${categoryPath(parent.slug)}` }] : []),
    ...(cat ? [{ name: cat.title, url: `${base}${categoryPath(cat.slug)}` }] : []),
    { name: product.title, url: `${base}/product/${product.id}` },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };

  // FAQPage из FAQ-блока описания (rich-сниппет «вопросы-ответы» в выдаче).
  const faqLd = faqPageLd(faqFromHtml(syncedDescriptionHtml));
  const schemas = [jsonLd, breadcrumbLd, ...(faqLd ? [faqLd] : [])];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(schemas) }} />
      <ProductDetailShell
        product={renderedProduct}
        related={related}
        variants={variants}
        productBlocks={productBlocks}
        allowZeroStock={allowZeroStock}
      />
    </>
  );
}
