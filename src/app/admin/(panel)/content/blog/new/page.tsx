import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PostForm } from "../PostForm";

export const metadata: Metadata = { title: "Новый пост" };

export default async function Page() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("blog_categories")
    .select("id,title")
    .order("sort_order", { ascending: true });
  const categories = (data ?? []) as { id: string; title: string }[];

  return (
    <>
      <PageHeader title="Новый пост" />
      <PostForm categories={categories} />
    </>
  );
}
