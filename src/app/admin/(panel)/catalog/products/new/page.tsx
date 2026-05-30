import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../ProductForm";
import { getProductOptions, getProductBadges } from "@/lib/content";

export const metadata: Metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const db = createSupabaseAdminClient();
  const [{ data }, { data: allProd }, { data: settings }, { data: rate }, optionDefs, badgeDefs] = await Promise.all([
    db.from("categories").select("slug,title,markup_percent,min_margin_rub").order("sort"),
    db.from("products").select("id,title,category_slug,image").eq("status", "published").is("deleted_at", null).order("sort"),
    db.from("pricing_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("currency_rates").select("usd").order("date", { ascending: false }).limit(1).maybeSingle(),
    getProductOptions(),
    getProductBadges(),
  ]);
  const categories = (data ?? []) as { slug: string; title: string }[];
  const categoryPricing = Object.fromEntries(
    (data ?? []).map((c) => [c.slug as string, { markup_percent: Number(c.markup_percent ?? 10), min_margin_rub: Number(c.min_margin_rub ?? 0) }])
  );
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

  return (
    <>
      <PageHeader title="Новый товар" description="Заполните основное, цены и (для Б/У) состояние." />
      <ProductForm
        categories={categories}
        optionDefs={optionDefs}
        badgeDefs={badgeDefs}
        allProducts={(allProd ?? []) as { id: string; title: string; category_slug: string; image: string | null }[]}
        pricingSettings={pricingSettings}
        categoryPricing={categoryPricing}
        cbrUsd={rate?.usd != null ? Number(rate.usd) : null}
      />
    </>
  );
}
