import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { RolesManager } from "./RolesManager";
import type { RoleInput } from "./actions";

export const metadata: Metadata = { title: "Роли и права" };

export default async function RolesPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("admin_roles")
    .select("key,label,full_access,permissions,is_system,sort")
    .order("sort");
  const roles = ((data ?? []) as RoleInput[]).map((r) => ({
    ...r,
    permissions: Array.isArray(r.permissions) ? r.permissions : [],
  }));

  return (
    <>
      <PageHeader
        title="Роли и права"
        description="Создавайте роли и отмечайте, какие разделы админки они видят. Назначайте роли сотрудникам в разделе «Администраторы»."
        actions={
          <Link href="/admin/settings/users">
            <AdminButton variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К сотрудникам
            </AdminButton>
          </Link>
        }
      />
      <RolesManager initial={roles} />
    </>
  );
}
