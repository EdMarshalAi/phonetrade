import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { AdvantageForm, type AdvantageValue } from "../../AdvantageForm";

export const metadata: Metadata = { title: "Преимущество" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("advantages").select("id,icon,title,description,sort_order,is_published").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={(data as AdvantageValue).title} description="Редактирование преимущества." />
      <AdvantageForm advantage={data as AdvantageValue} />
    </>
  );
}
