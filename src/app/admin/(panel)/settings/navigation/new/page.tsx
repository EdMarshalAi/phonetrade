import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { MenuItemForm } from "../MenuItemForm";

export const metadata: Metadata = { title: "Новый пункт меню" };

const VALID = ["top", "main", "footer"];

export default async function NewMenuItemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin(["admin"]);
  const sp = await searchParams;
  const location = VALID.includes(sp.location as string) ? (sp.location as string) : undefined;
  return (
    <>
      <PageHeader title="Новый пункт меню" description="Добавьте пункт в одно из меню сайта." />
      <MenuItemForm defaultLocation={location} />
    </>
  );
}
