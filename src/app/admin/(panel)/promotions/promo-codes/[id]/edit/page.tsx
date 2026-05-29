import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PromoForm, type PromoValue } from "../../PromoForm";

export const metadata: Metadata = { title: "Промокод" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("promo_codes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={(data as PromoValue).code} description="Редактирование промокода." />
      <PromoForm promo={data as PromoValue} />
    </>
  );
}
