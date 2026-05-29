"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { categorySchema, type CategoryInput } from "@/lib/admin/schemas";

const STAFF = ["admin", "manager", "content"] as const;

function normalize(input: CategoryInput) {
  return {
    title: input.title.trim(),
    parent_slug: input.parent_slug || null,
    subtitle: input.subtitle || null,
    description: input.description || null,
    image: input.image || "",
    icon_url: input.icon_url || null,
    meta_title: input.meta_title || null,
    meta_description: input.meta_description || null,
    seo_text: input.seo_text || null,
    sort: input.sort ?? 0,
    show_on_home: input.show_on_home ?? false,
    home_limit: input.home_limit ?? 8,
    is_published: input.is_published ?? true,
    updated_at: new Date().toISOString(),
  };
}

function friendly(message: string): string {
  if (message.includes("duplicate") || message.includes("unique") || message.includes("pkey")) {
    return "Категория с таким slug уже существует";
  }
  return message;
}

export async function createCategory(input: CategoryInput): Promise<{ error?: string }> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "category",
      entityId: parsed.data.slug,
      changes: parsed.data,
      revalidate: ["/", `/category/${parsed.data.slug}`],
      run: async (db) => {
        const { error } = await db
          .from("categories")
          .insert({ slug: parsed.data.slug, id: parsed.data.slug, ...normalize(parsed.data) });
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/categories");
}

export async function updateCategory(slug: string, input: CategoryInput): Promise<{ error?: string }> {
  const parsed = categorySchema.safeParse({ ...input, slug });
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "category",
      entityId: slug,
      changes: parsed.data,
      revalidate: ["/", `/category/${slug}`],
      run: async (db) => {
        const { error } = await db.from("categories").update(normalize(parsed.data)).eq("slug", slug);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/categories");
}

export async function deleteCategory(slug: string): Promise<{ error?: string }> {
  // Защита: нельзя удалить категорию с товарами или дочерними категориями.
  const db = createSupabaseAdminClient();
  const [{ count: products }, { count: children }] = await Promise.all([
    db.from("products").select("*", { count: "exact", head: true }).eq("category_slug", slug),
    db.from("categories").select("*", { count: "exact", head: true }).eq("parent_slug", slug),
  ]);
  if ((products ?? 0) > 0) return { error: `В категории ${products} товар(ов) — сначала перенесите их` };
  if ((children ?? 0) > 0) return { error: "У категории есть подкатегории — сначала удалите их" };

  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "category",
      entityId: slug,
      revalidate: ["/"],
      run: async (d) => {
        const { error } = await d.from("categories").delete().eq("slug", slug);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
