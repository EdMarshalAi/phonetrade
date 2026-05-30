import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { ProductForm, type ProductValue } from "../../ProductForm";
import type { ProductImage } from "../../VariantsManager";
import { productImages } from "@/lib/utils/product-images";
import { getProductOptions, getProductBadges } from "@/lib/content";

export const metadata: Metadata = { title: "Товар" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const [{ data: prod }, { data: cats }, { data: varRows }, { data: allProd }, { data: settings }, { data: rate }, { data: history }, optionDefs, badgeDefs] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("categories").select("slug,title,markup_percent,min_margin_rub").order("sort"),
    db.from("product_variants").select("*").eq("product_id", id).order("sort_order"),
    db.from("products").select("id,title,category_slug,image").eq("status", "published").is("deleted_at", null).order("sort"),
    db.from("pricing_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("currency_rates").select("usd").order("date", { ascending: false }).limit(1).maybeSingle(),
    db.from("product_price_history").select("id,cost_rub,cost_rate,price_cash,price_card,reason,changed_at").eq("product_id", id).order("changed_at", { ascending: false }).limit(20),
    getProductOptions(),
    getProductBadges(),
  ]);
  const pricingSettings = settings
    ? {
        working_usd_rate: Number(settings.working_usd_rate),
        default_markup_percent: Number(settings.default_markup_percent),
        card_markup_percent: Number(settings.card_markup_percent),
        credit_6m_markup_percent: Number(settings.credit_6m_markup_percent),
        credit_12m_markup_percent: Number(settings.credit_12m_markup_percent),
        credit_24m_markup_percent: Number(settings.credit_24m_markup_percent),
        price_rounding: Number(settings.price_rounding),
      }
    : null;

  if (!prod) notFound();
  const categories = (cats ?? []) as { slug: string; title: string }[];
  const categoryPricing = Object.fromEntries(
    (cats ?? []).map((c) => [c.slug as string, { markup_percent: Number(c.markup_percent ?? 10), min_margin_rub: Number(c.min_margin_rub ?? 0) }])
  );
  const product = { ...prod, id } as ProductValue;

  // Галерея берётся из тех же колонок, что и сайт (image + gallery), а не из
  // отдельной таблицы — чтобы в админке и на витрине были одинаковые фото.
  const imgRows: ProductImage[] = productImages({
    image: (prod.image as string) ?? "",
    gallery: Array.isArray(prod.gallery) ? (prod.gallery as string[]) : undefined,
  }).map((url, i) => ({
    id: url,
    product_id: id,
    variant_id: null,
    url,
    alt: null,
    sort_order: i,
    is_primary: url === prod.image,
  }));

  return (
    <>
      <PageHeader
        title={prod.title}
        description="Редактирование товара."
        actions={
          <Link href={`/product/${id}`} target="_blank">
            <AdminButton variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} /> На сайте
            </AdminButton>
          </Link>
        }
      />
      <ProductForm
        product={product}
        categories={categories}
        variants={varRows ?? []}
        images={imgRows ?? []}
        optionDefs={optionDefs}
        badgeDefs={badgeDefs}
        allProducts={(allProd ?? []) as { id: string; title: string; category_slug: string; image: string | null }[]}
        pricingSettings={pricingSettings}
        categoryPricing={categoryPricing}
        cbrUsd={rate?.usd != null ? Number(rate.usd) : null}
        priceHistory={(history ?? []).map((h) => ({
          id: h.id as number,
          cost_rub: h.cost_rub != null ? Number(h.cost_rub) : null,
          cost_rate: h.cost_rate != null ? Number(h.cost_rate) : null,
          price_cash: h.price_cash != null ? Number(h.price_cash) : null,
          price_card: h.price_card != null ? Number(h.price_card) : null,
          reason: (h.reason as string | null) ?? null,
          changed_at: h.changed_at as string,
        }))}
      />
    </>
  );
}
