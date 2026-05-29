import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { MenuItemForm } from "../../MenuItemForm";
import type { MenuItemValue } from "../../MenuItemForm";

export const metadata: Metadata = { title: "Редактирование пункта меню" };

export default async function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(["admin"]);
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("menu_items")
    .select("id, menu_location, title, link_url, link_type, link_target_id, sort_order, is_visible")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const item = data as MenuItemValue;

  return (
    <>
      <PageHeader
        title="Редактирование пункта меню"
        description={`«${item.title}»`}
      />
      <MenuItemForm item={item} />
    </>
  );
}
