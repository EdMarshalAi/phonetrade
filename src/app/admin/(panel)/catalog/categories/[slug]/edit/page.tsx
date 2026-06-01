import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm, type CategoryValue } from "../../CategoryForm";
import { getProductOptions } from "@/lib/content";

export const metadata: Metadata = { title: "Категория" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = createSupabaseAdminClient();
  const [{ data: cat }, { data: all }, optionDefs] = await Promise.all([
    db
      .from("categories")
      .select("slug,title,parent_slug,subtitle,description,image,icon_url,meta_title,meta_description,seo_text,sort,show_on_home,home_limit,available_filters,default_sort,is_published")
      .eq("slug", slug)
      .maybeSingle(),
    db.from("categories").select("slug,title").order("sort"),
    getProductOptions(),
  ]);

  if (!cat) notFound();
  const category = cat as CategoryValue;
  const parents = ((all ?? []) as { slug: string; title: string }[]).filter((p) => p.slug !== slug);

  return (
    <>
      <PageHeader title={category.title} description="Редактирование категории." />
      <CategoryForm category={category} parents={parents} optionDefs={optionDefs} />
    </>
  );
}
