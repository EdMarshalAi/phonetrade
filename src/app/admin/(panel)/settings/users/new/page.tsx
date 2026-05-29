import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { NewUserForm } from "../NewUserForm";

export const metadata: Metadata = { title: "Новый пользователь" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHeader title="Новый пользователь админки" description="Создайте сотрудника и выдайте роль." />
      <NewUserForm />
    </>
  );
}
