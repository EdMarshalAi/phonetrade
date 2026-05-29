import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm, type BlogCategoryValue } from "../../CategoryForm";

export const metadata: Metadata = { title: "Категория блога" };

export default async function EditBlogCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("blog_categories")
    .select("id,title,slug,color,sort_order")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const category = data as BlogCategoryValue;

  return (
    <>
      <PageHeader title={category.title} description="Редактирование категории блога." />
      <CategoryForm category={category} />
    </>
  );
}
