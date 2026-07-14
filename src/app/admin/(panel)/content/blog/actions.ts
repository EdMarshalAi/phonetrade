"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { blogPostSchema, type BlogPostInput } from "@/lib/admin/schemas";

const CONTENT = ["admin", "content"] as const;

function normalize(input: BlogPostInput, updatedAt = new Date().toISOString()) {
  const category_id = input.category_id && input.category_id !== "" ? input.category_id : null;
  const tags = input.tags
    ? input.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  return {
    title: input.title.trim(),
    excerpt: input.excerpt || null,
    content: input.content || null,
    cover_url: input.cover_url || null,
    category_id,
    tags,
    status: input.status,
    meta_title: input.meta_title || null,
    meta_description: input.meta_description || null,
    updated_at: updatedAt,
  };
}

function friendly(m: string): string {
  return m.includes("duplicate") || m.includes("unique") ? "Пост с таким slug уже существует" : m;
}

export async function createBlogPost(input: BlogPostInput): Promise<{ error?: string }> {
  const parsed = blogPostSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "create",
      entityType: "blog_post",
      entityId: parsed.data.slug,
      changes: parsed.data,
      revalidate: ["/blog", "/"],
      run: async (db) => {
        const now = new Date().toISOString();
        const { error } = await db.from("blog_posts").insert({
          slug: parsed.data.slug,
          ...normalize(parsed.data, now),
          published_at: parsed.data.status === "published" ? now : null,
        });
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/content/blog");
}

export async function updateBlogPost(id: string, input: BlogPostInput): Promise<{ error?: string }> {
  const parsed = blogPostSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "blog_post",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/blog", "/"],
      run: async (db) => {
        const { data: current, error: currentError } = await db
          .from("blog_posts")
          .select("published_at")
          .eq("id", id)
          .maybeSingle();
        if (currentError) throw currentError;
        if (!current) throw new Error("Статья не найдена");

        const now = new Date().toISOString();
        const firstPublishedAt = parsed.data.status === "published" && !current.published_at ? now : null;
        const { error } = await db
          .from("blog_posts")
          .update({
            ...normalize(parsed.data, now),
            ...(firstPublishedAt ? { published_at: firstPublishedAt } : {}),
          })
          .eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/content/blog");
}

export async function deleteBlogPost(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "delete",
      entityType: "blog_post",
      entityId: id,
      run: async (db) => {
        const { error } = await db.from("blog_posts").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
