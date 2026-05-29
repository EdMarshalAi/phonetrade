"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { advantageSchema, type AdvantageInput } from "@/lib/admin/schemas";

const CONTENT = ["admin", "content"] as const;

function normalize(input: AdvantageInput) {
  return {
    icon: input.icon || null,
    title: input.title.trim(),
    description: input.description || null,
    sort_order: input.sort_order ?? 0,
    is_published: input.is_published ?? true,
  };
}

export async function createAdvantage(input: AdvantageInput): Promise<{ error?: string }> {
  const parsed = advantageSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "create",
      entityType: "advantage",
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("advantages").insert(normalize(parsed.data));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/home-blocks?tab=advantages");
}

export async function updateAdvantage(id: string, input: AdvantageInput): Promise<{ error?: string }> {
  const parsed = advantageSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "advantage",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("advantages").update(normalize(parsed.data)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/home-blocks?tab=advantages");
}

export async function deleteAdvantage(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "delete",
      entityType: "advantage",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("advantages").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
