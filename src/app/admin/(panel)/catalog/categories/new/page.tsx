import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "../CategoryForm";

export const metadata: Metadata = { title: "Новая категория" };

export default async function NewCategoryPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("categories").select("slug,title").order("sort");
  const parents = (data ?? []) as { slug: string; title: string }[];

  return (
    <>
      <PageHeader title="Новая категория" description="Название, slug, изображения и SEO." />
      <CategoryForm parents={parents} />
    </>
  );
}
