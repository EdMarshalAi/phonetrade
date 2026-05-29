import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { BentoForm, type BentoValue } from "../../BentoForm";

export const metadata: Metadata = { title: "Плитка" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("bento_tiles")
    .select("id,category_slug,custom_title,subtitle,custom_image_url,size,theme,sort_order,is_published")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const { data: catData } = await db.from("categories").select("slug,title").order("sort");
  const categories = (catData ?? []) as { slug: string; title: string }[];

  return (
    <>
      <PageHeader
        title={(data as BentoValue).custom_title ?? (data as BentoValue).category_slug ?? "Плитка"}
        description="Редактирование bento-плитки."
      />
      <BentoForm tile={data as BentoValue} categories={categories} />
    </>
  );
}
