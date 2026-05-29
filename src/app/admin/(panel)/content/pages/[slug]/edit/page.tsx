import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PageForm, type PageValue } from "../../PageForm";

export const metadata: Metadata = { title: "Страница" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("static_pages").select("slug,title,content,meta_title,meta_description,status").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={(data as PageValue).title} description={`/${slug}`} />
      <PageForm page={data as PageValue} />
    </>
  );
}
