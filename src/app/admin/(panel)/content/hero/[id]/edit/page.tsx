import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { HeroForm, type HeroValue } from "../../HeroForm";
import { loadHeroPickerData } from "../../picker-data";

export const metadata: Metadata = { title: "Слайд" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const [{ data }, picker] = await Promise.all([
    db
      .from("hero_slides")
      .select("id,overline,title,description,button_text,button_link,image_url,bg_color,theme,sort_order,is_published")
      .eq("id", id)
      .maybeSingle(),
    loadHeroPickerData(),
  ]);
  if (!data) notFound();
  return (
    <>
      <PageHeader title={(data as HeroValue).title} description="Редактирование слайда." />
      <HeroForm slide={data as HeroValue} categories={picker.categories} products={picker.products} />
    </>
  );
}
