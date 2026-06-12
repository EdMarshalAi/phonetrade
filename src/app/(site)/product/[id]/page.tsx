import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductById,
  getRelatedProducts,
  getVariantsForProduct,
  getCategories,
} from "@/lib/products";
import { getProductBlocks } from "@/lib/content";
import { ProductDetailShell } from "@/components/product-detail/ProductDetailShell";
import { productImages } from "@/lib/utils/product-images";
import { jsonLdScript } from "@/lib/utils/json-ld";
import { faqFromHtml, faqPageLd } from "@/lib/utils/faq-schema";

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
  const description = product.metaDescription || product.shortDescription || `Купить ${product.title} в Белгороде с гарантией PhoneTrade.`;
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

  const [related, variants, productBlocks, allCats] = await Promise.all([
    getRelatedProducts(product, 8),
    getVariantsForProduct(product),
    getProductBlocks(),
    getCategories().catch(() => []),
  ]);

  // Schema.org Product (JSON-LD) — расширенные сниппеты в поиске.
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
  const inStock = product.stock == null || product.stock > 0;
  const brandName = /samsung/i.test(product.title) ? "Samsung" : /яндекс|station|станц/i.test(product.title) ? "Яндекс" : /sony|playstation|dualsense/i.test(product.title) ? "Sony" : "Apple";
  const price = product.priceCash;
  // priceValidUntil — конец след. года (рекомендация Google для Offer).
  const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: productImages(product),
    description: `${product.title} — купить в Белгороде в PhoneTrade: гарантия, доставка и самовывоз.`,
    sku: product.sku || product.id,
    brand: { "@type": "Brand", name: product.brand && product.brand !== "Other" ? product.brand : brandName },
    // Offer рендерим только при наличии цены (Offer без price/priceSpecification невалиден).
    ...(price && price > 0
      ? {
          offers: {
            "@type": "Offer",
            url: `${base}/product/${product.id}`,
            priceCurrency: "RUB",
            price,
            priceValidUntil,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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
    ...(parent ? [{ name: parent.title, url: `${base}/category/${parent.slug}` }] : []),
    ...(cat ? [{ name: cat.title, url: `${base}/category/${cat.slug}` }] : []),
    { name: product.title, url: `${base}/product/${product.id}` },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };

  // FAQPage из FAQ-блока описания (rich-сниппет «вопросы-ответы» в выдаче).
  const faqLd = faqPageLd(faqFromHtml(product.descriptionHtml));
  const schemas = [jsonLd, breadcrumbLd, ...(faqLd ? [faqLd] : [])];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(schemas) }} />
      <ProductDetailShell
        product={product}
        related={related}
        variants={variants}
        productBlocks={productBlocks}
      />
    </>
  );
}
