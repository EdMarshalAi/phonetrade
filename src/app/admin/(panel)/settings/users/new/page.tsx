import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { NewUserForm } from "../NewUserForm";

export const metadata: Metadata = { title: "Новый сотрудник" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("admin_roles").select("key,label").order("sort");
  const roles = (data ?? []) as { key: string; label: string }[];
  return (
    <>
      <PageHeader title="Новый сотрудник админки" description="Создайте сотрудника и выдайте роль." />
      <NewUserForm roles={roles} />
    </>
  );
}
