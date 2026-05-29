import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { HeroForm, type HeroValue } from "../../HeroForm";

export const metadata: Metadata = { title: "Слайд" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("hero_slides").select("id,overline,title,description,button_text,button_link,image_url,theme,sort_order,is_published").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={(data as HeroValue).title} description="Редактирование слайда." />
      <HeroForm slide={data as HeroValue} />
    </>
  );
}
