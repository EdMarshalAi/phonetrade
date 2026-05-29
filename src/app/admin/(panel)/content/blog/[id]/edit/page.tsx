import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PostForm, type BlogPostValue } from "../../PostForm";

export const metadata: Metadata = { title: "Пост" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseAdminClient();

  const [{ data }, { data: cats }] = await Promise.all([
    db
      .from("blog_posts")
      .select("id,title,slug,excerpt,content,cover_url,category_id,tags,status,meta_title,meta_description")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("blog_categories")
      .select("id,title")
      .order("sort_order", { ascending: true }),
  ]);

  if (!data) notFound();

  const raw = data as {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    cover_url: string | null;
    category_id: string | null;
    tags: string[] | null;
    status: "draft" | "published" | "archived";
    meta_title: string | null;
    meta_description: string | null;
  };

  // Convert text[] → CSV string for the form
  const post: BlogPostValue = {
    ...raw,
    tags: (raw.tags ?? []).join(", "),
  };

  const categories = (cats ?? []) as { id: string; title: string }[];

  return (
    <>
      <PageHeader title={post.title} description="Редактирование поста." />
      <PostForm post={post} categories={categories} />
    </>
  );
}
