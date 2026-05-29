import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("categories").select("slug,title").order("sort");
  const categories = (data ?? []) as { slug: string; title: string }[];

  return (
    <>
      <PageHeader title="Новый товар" description="Заполните основное, цены и (для Б/У) состояние." />
      <ProductForm categories={categories} />
    </>
  );
}
