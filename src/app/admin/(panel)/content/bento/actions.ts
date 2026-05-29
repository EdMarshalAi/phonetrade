"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { bentoSchema, type BentoInput } from "@/lib/admin/schemas";

const CONTENT = ["admin", "content"] as const;

function normalize(input: BentoInput) {
  return {
    category_slug: input.category_slug || null,
    custom_title: input.custom_title || null,
    subtitle: input.subtitle || null,
    custom_image_url: input.custom_image_url || null,
    size: input.size,
    theme: input.theme,
    sort_order: input.sort_order ?? 0,
    is_published: input.is_published ?? true,
  };
}

export async function createBentoTile(input: BentoInput): Promise<{ error?: string }> {
  const parsed = bentoSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "create",
      entityType: "bento_tile",
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("bento_tiles").insert(normalize(parsed.data));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/home-blocks?tab=bento");
}

export async function updateBentoTile(id: string, input: BentoInput): Promise<{ error?: string }> {
  const parsed = bentoSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "bento_tile",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("bento_tiles").update(normalize(parsed.data)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/home-blocks?tab=bento");
}

export async function deleteBentoTile(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "delete",
      entityType: "bento_tile",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("bento_tiles").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
