import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { BrandForm, type BrandValue } from "../../BrandForm";

export const metadata: Metadata = { title: "Бренд" };

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("brands")
    .select("id,title,slug,logo_url,link_url,sort_order,is_published")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const brand = data as BrandValue;

  return (
    <>
      <PageHeader title={brand.title} description="Редактирование бренда." />
      <BrandForm brand={brand} />
    </>
  );
}
