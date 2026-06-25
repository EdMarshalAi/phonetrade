import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { PricingShell, type PricingRow, type CourseInfo } from "./PricingShell";
import type { PricingSettingsInput } from "./actions";
import { DEFAULT_EXPORT_PREFS, DEFAULT_YML_PREFS, type PricingExportPrefs, type YmlFeedPrefs } from "./export-columns";

export const metadata: Metadata = { title: "Прайс" };
export const dynamic = "force-dynamic";

const num = (v: unknown): number | null => (v == null ? null : Number(v));

export default async function PricingPage() {
  await requireAdmin(["admin", "manager"]);
  const db = createSupabaseAdminClient();

  const [{ data: s }, { data: rates }, { data: prods }, { data: cats }, { data: exportPrefsRow }, { data: ymlPrefsRow }] = await Promise.all([
    db.from("pricing_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("currency_rates").select("date,usd,eur,fetched_at").order("date", { ascending: false }).limit(2),
    db
      .from("products")
      .select("id,sku,title,color,memory,category_slug,image,type,is_used,status,cost_rub,cost_rate,cost_usd,price_cash,price_card,credit_6m_monthly,credit_12m_monthly,credit_24m_monthly,price_override")
      .is("deleted_at", null)
      .neq("type", "used")
      .order("category_slug")
      .order("title")
      .limit(5000),
    db.from("categories").select("slug,title,parent_slug,sort,markup_percent,min_margin_rub,card_markup_percent").order("sort"),
    db.from("shop_settings").select("value").eq("key", "pricing_export_prefs").maybeSingle(),
    db.from("shop_settings").select("value").eq("key", "yml_feed_prefs").maybeSingle(),
  ]);

  const settings: PricingSettingsInput = {
    working_usd_rate: num(s?.working_usd_rate) ?? 90,
    use_cbr_auto: !!s?.use_cbr_auto,
    cbr_markup_percent: num(s?.cbr_markup_percent) ?? 0,
    default_markup_percent: num(s?.default_markup_percent) ?? 10,
    card_markup_percent: num(s?.card_markup_percent) ?? 15,
    credit_6m_markup_percent: num(s?.credit_6m_markup_percent) ?? 23,
    credit_12m_markup_percent: num(s?.credit_12m_markup_percent) ?? 28,
    credit_24m_markup_percent: num(s?.credit_24m_markup_percent) ?? 37,
    price_rounding: num(s?.price_rounding) ?? 1000,
  };

  const latest = rates?.[0];
  const prev = rates?.[1];
  const course: CourseInfo = {
    usd: num(latest?.usd),
    eur: num(latest?.eur),
    prevUsd: num(prev?.usd),
    prevEur: num(prev?.eur),
    date: (latest?.date as string) ?? null,
    fetchedAt: (latest?.fetched_at as string) ?? null,
  };

  const rows: PricingRow[] = (prods ?? []).map((p) => ({
    id: p.id as string,
    sku: (p.sku as string | null) ?? null,
    title: p.title as string,
    color: (p.color as string | null) ?? null,
    memory: (p.memory as string | null) ?? null,
    category_slug: (p.category_slug as string | null) ?? null,
    image: (p.image as string | null) ?? null,
    status: (p.status as string | null) ?? null,
    is_used: !!p.is_used,
    cost_rub: num(p.cost_rub),
    cost_rate: num(p.cost_rate),
    cost_usd: num(p.cost_usd),
    price_cash: num(p.price_cash),
    price_card: num(p.price_card),
    credit_6m_monthly: num(p.credit_6m_monthly),
    credit_12m_monthly: num(p.credit_12m_monthly),
    credit_24m_monthly: num(p.credit_24m_monthly),
    price_override: !!p.price_override,
  }));

  const categories = (cats ?? []).map((c) => ({
    slug: c.slug as string,
    title: c.title as string,
    parent_slug: (c.parent_slug as string | null) ?? null,
    markup_percent: num(c.markup_percent) ?? 10,
    min_margin_rub: num(c.min_margin_rub) ?? 0,
    card_markup_percent: num(c.card_markup_percent) ?? 15,
  }));

  return (
    <>
      <PageHeader
        title="Прайс"
        description="Курс, формула и массовое редактирование цен. Цены пересчитываются от закупки в долларах."
        actions={
          <Link href="/admin/catalog/products">
            <AdminButton variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К товарам
            </AdminButton>
          </Link>
        }
      />
      <PricingShell settings={settings} course={course} rows={rows} categories={categories} exportPrefs={(exportPrefsRow?.value as PricingExportPrefs) ?? DEFAULT_EXPORT_PREFS} ymlPrefs={(ymlPrefsRow?.value as YmlFeedPrefs) ?? DEFAULT_YML_PREFS} />
    </>
  );
}
