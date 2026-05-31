"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { heroSchema, type HeroInput } from "@/lib/admin/schemas";

const CONTENT = ["admin", "content"] as const;

function normalize(input: HeroInput) {
  return {
    overline: input.overline || null,
    title: input.title.trim(),
    description: input.description || null,
    button_text: input.button_text || null,
    button_link: input.button_link || null,
    image_url: input.image_url || null,
    bg_color: input.bg_color || null,
    theme: input.theme,
    sort_order: input.sort_order ?? 0,
    is_published: input.is_published ?? true,
  };
}

export async function createHeroSlide(input: HeroInput): Promise<{ error?: string }> {
  const parsed = heroSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "create",
      entityType: "hero_slide",
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("hero_slides").insert(normalize(parsed.data));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/hero");
}

export async function updateHeroSlide(id: string, input: HeroInput): Promise<{ error?: string }> {
  const parsed = heroSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "hero_slide",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("hero_slides").update(normalize(parsed.data)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/hero");
}

export async function deleteHeroSlide(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "delete",
      entityType: "hero_slide",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("hero_slides").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
