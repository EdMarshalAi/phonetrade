import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../ProductForm";
import { getProductOptions, getProductBadges } from "@/lib/content";

export const metadata: Metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const db = createSupabaseAdminClient();
  const [{ data }, { data: allProd }, optionDefs, badgeDefs] = await Promise.all([
    db.from("categories").select("slug,title").order("sort"),
    db.from("products").select("id,title,category_slug,image").eq("status", "published").is("deleted_at", null).order("sort"),
    getProductOptions(),
    getProductBadges(),
  ]);
  const categories = (data ?? []) as { slug: string; title: string }[];

  return (
    <>
      <PageHeader title="Новый товар" description="Заполните основное, цены и (для Б/У) состояние." />
      <ProductForm
        categories={categories}
        optionDefs={optionDefs}
        badgeDefs={badgeDefs}
        allProducts={(allProd ?? []) as { id: string; title: string; category_slug: string; image: string | null }[]}
      />
    </>
  );
}
