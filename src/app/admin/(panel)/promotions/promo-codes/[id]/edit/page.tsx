import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PromoForm, type PromoValue } from "../../PromoForm";

export const metadata: Metadata = { title: "Промокод" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const [{ data }, cats] = await Promise.all([
    db.from("promo_codes").select("*").eq("id", id).maybeSingle(),
    db.from("categories").select("slug,title").order("sort", { ascending: true }),
  ]);
  if (!data) notFound();
  const categories = (cats.data ?? []).map((c) => ({ slug: c.slug as string, title: c.title as string }));
  return (
    <>
      <PageHeader title={(data as PromoValue).code} description="Редактирование промокода." />
      <PromoForm promo={data as PromoValue} categories={categories} />
    </>
  );
}
