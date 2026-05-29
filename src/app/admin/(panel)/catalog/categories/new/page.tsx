import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "../CategoryForm";
import { getProductOptions } from "@/lib/content";

export const metadata: Metadata = { title: "Новая категория" };

export default async function NewCategoryPage() {
  const db = createSupabaseAdminClient();
  const [{ data }, optionDefs] = await Promise.all([
    db.from("categories").select("slug,title").order("sort"),
    getProductOptions(),
  ]);
  const parents = (data ?? []) as { slug: string; title: string }[];

  return (
    <>
      <PageHeader title="Новая категория" description="Название, slug, изображения, фильтры и SEO." />
      <CategoryForm parents={parents} optionDefs={optionDefs} />
    </>
  );
}
