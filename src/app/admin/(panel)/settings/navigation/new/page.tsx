import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { MenuItemForm } from "../MenuItemForm";

export const metadata: Metadata = { title: "Новый пункт меню" };

export default async function NewMenuItemPage() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHeader title="Новый пункт меню" description="Добавьте пункт в одно из меню сайта." />
      <MenuItemForm />
    </>
  );
}
