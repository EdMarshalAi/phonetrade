import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { RoleSelect, ActiveToggle } from "./UserControls";

export const metadata: Metadata = { title: "Пользователи админки" };

interface Row {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
}

export default async function UsersPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("admin_users").select("id,email,full_name,role,is_active,last_login_at").order("created_at");
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader
        title="Пользователи админки"
        description="Сотрудники, роли и доступ. Управление доступно только администраторам."
        actions={
          <Link href="/admin/settings/users/new">
            <AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Добавить</AdminButton>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="Нет пользователей" />
      ) : (
        <Table>
          <THead>
            <TH>Имя</TH>
            <TH>Email</TH>
            <TH className="w-44">Роль</TH>
            <TH className="w-40">Последний вход</TH>
            <TH className="w-24">Активен</TH>
          </THead>
          <TBody>
            {rows.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium">{u.full_name || "—"}</TD>
                <TD className="text-ink-muted">{u.email}</TD>
                <TD><RoleSelect id={u.id} role={u.role} /></TD>
                <TD className="text-ink-muted">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—"}</TD>
                <TD><ActiveToggle id={u.id} active={u.is_active} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
