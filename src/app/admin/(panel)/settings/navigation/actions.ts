"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";

export type MenuLocation = "top" | "main" | "footer";
export type LinkType = "url" | "category" | "page";

export interface MenuItemInput {
  menu_location: MenuLocation;
  title: string;
  link_url: string;
  link_type: LinkType;
  link_target_id?: string;
  sort_order: number;
  is_visible: boolean;
}

function normalize(input: MenuItemInput) {
  return {
    menu_location: input.menu_location,
    title: input.title.trim(),
    link_url: input.link_url.trim(),
    link_type: input.link_type,
    link_target_id: input.link_target_id?.trim() || null,
    sort_order: Number(input.sort_order) || 0,
    is_visible: input.is_visible ?? true,
  };
}

export async function createMenuItem(input: MenuItemInput): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "create",
      entityType: "menu_item",
      entityId: null,
      changes: input,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("menu_items").insert(normalize(input));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка создания" };
  }
  redirect("/admin/settings/navigation");
}

export async function updateMenuItem(id: string, input: MenuItemInput): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "menu_item",
      entityId: id,
      changes: input,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("menu_items").update(normalize(input)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/settings/navigation");
}

export async function deleteMenuItem(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "delete",
      entityType: "menu_item",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("menu_items").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
