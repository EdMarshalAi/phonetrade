"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { blogCategorySchema, type BlogCategoryInput } from "@/lib/admin/schemas";

const CONTENT = ["admin", "content"] as const;

function normalize(input: BlogCategoryInput) {
  return {
    title: input.title.trim(),
    color: input.color || null,
    sort_order: input.sort_order,
    updated_at: new Date().toISOString(),
  };
}

function friendly(m: string): string {
  return m.includes("duplicate") || m.includes("unique") ? "Категория с таким slug уже существует" : m;
}

export async function createBlogCategory(input: BlogCategoryInput): Promise<{ error?: string }> {
  const parsed = blogCategorySchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "create",
      entityType: "blog_category",
      entityId: parsed.data.slug,
      changes: parsed.data,
      revalidate: ["/blog"],
      run: async (db) => {
        const { error } = await db.from("blog_categories").insert({
          slug: parsed.data.slug,
          ...normalize(parsed.data),
        });
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/content/blog/categories");
}

export async function updateBlogCategory(id: string, input: BlogCategoryInput): Promise<{ error?: string }> {
  const parsed = blogCategorySchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "blog_category",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/blog"],
      run: async (db) => {
        const { error } = await db
          .from("blog_categories")
          .update(normalize(parsed.data))
          .eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/content/blog/categories");
}

export async function deleteBlogCategory(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "delete",
      entityType: "blog_category",
      entityId: id,
      run: async (db) => {
        const { error } = await db.from("blog_categories").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
