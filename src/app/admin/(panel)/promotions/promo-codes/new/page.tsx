import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PromoForm } from "../PromoForm";

export const metadata: Metadata = { title: "Новый промокод" };

async function loadCategories() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("categories").select("slug,title").order("sort", { ascending: true });
  return (data ?? []).map((c) => ({ slug: c.slug as string, title: c.title as string }));
}

export default async function Page() {
  const categories = await loadCategories();
  return (
    <>
      <PageHeader title="Новый промокод" />
      <PromoForm categories={categories} />
    </>
  );
}
