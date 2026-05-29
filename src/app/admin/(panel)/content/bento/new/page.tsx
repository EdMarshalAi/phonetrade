import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { BentoForm } from "../BentoForm";

export const metadata: Metadata = { title: "Новая плитка" };

export default async function Page() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("categories").select("slug,title").order("sort");
  const categories = (data ?? []) as { slug: string; title: string }[];

  return (
    <>
      <PageHeader title="Новая плитка" description="Заголовок, изображение, размер и тема." />
      <BentoForm categories={categories} />
    </>
  );
}
