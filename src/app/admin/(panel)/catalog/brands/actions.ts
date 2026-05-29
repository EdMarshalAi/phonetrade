"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { brandSchema, type BrandInput } from "@/lib/admin/schemas";

const STAFF = ["admin", "manager", "content"] as const;

function normalize(input: BrandInput) {
  return {
    title: input.title.trim(),
    slug: input.slug.trim(),
    logo_url: input.logo_url || null,
    link_url: input.link_url || null,
    sort_order: input.sort_order ?? 0,
    is_published: input.is_published ?? true,
  };
}

function friendly(message: string): string {
  if (message.includes("duplicate") || message.includes("unique")) {
    return "Бренд с таким slug уже существует";
  }
  return message;
}

export async function createBrand(input: BrandInput): Promise<{ error?: string }> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "brand",
      entityId: parsed.data.slug,
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("brands").insert(normalize(parsed.data));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/brands");
}

export async function updateBrand(id: string, input: BrandInput): Promise<{ error?: string }> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "brand",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("brands").update(normalize(parsed.data)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/brands");
}

export async function deleteBrand(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "brand",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("brands").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
