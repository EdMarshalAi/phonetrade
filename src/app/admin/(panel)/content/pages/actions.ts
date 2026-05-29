"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { staticPageSchema, type StaticPageInput } from "@/lib/admin/schemas";

const CONTENT = ["admin", "content"] as const;

function normalize(input: StaticPageInput) {
  return {
    title: input.title.trim(),
    content: input.content || null,
    meta_title: input.meta_title || null,
    meta_description: input.meta_description || null,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
}

function friendly(m: string): string {
  return m.includes("duplicate") || m.includes("unique") ? "Страница с таким slug уже существует" : m;
}

export async function createPage(input: StaticPageInput): Promise<{ error?: string }> {
  const parsed = staticPageSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "create",
      entityType: "static_page",
      entityId: parsed.data.slug,
      changes: parsed.data,
      revalidate: [`/${parsed.data.slug}`],
      run: async (db) => {
        const { error } = await db.from("static_pages").insert({ slug: parsed.data.slug, ...normalize(parsed.data) });
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/content/pages");
}

export async function updatePage(slug: string, input: StaticPageInput): Promise<{ error?: string }> {
  const parsed = staticPageSchema.safeParse({ ...input, slug });
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "static_page",
      entityId: slug,
      changes: parsed.data,
      revalidate: [`/${slug}`],
      run: async (db) => {
        const { error } = await db.from("static_pages").update(normalize(parsed.data)).eq("slug", slug);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка") };
  }
  redirect("/admin/content/pages");
}

export async function deletePage(slug: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "delete",
      entityType: "static_page",
      entityId: slug,
      run: async (db) => {
        const { error } = await db.from("static_pages").delete().eq("slug", slug);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
