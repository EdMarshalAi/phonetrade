import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils/cn";
import { PageHeader } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { AuditLogView } from "@/components/admin/AuditLogView";
import { RoleSelect, ActiveToggle } from "./UserControls";

export const metadata: Metadata = { title: "Администраторы" };

const TABS = [
  { key: "users", label: "Сотрудники" },
  { key: "audit", label: "Журнал действий" },
] as const;
type Tab = (typeof TABS)[number]["key"];

interface Row {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin(["admin"]);
  const sp = await searchParams;
  const tab: Tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "users") as Tab;

  return (
    <>
      <PageHeader
        title="Администраторы"
        description="Сотрудники, роли и права доступа к разделам, журнал действий."
        actions={
          tab === "users" ? (
            <div className="flex items-center gap-2">
              <Link href="/admin/settings/users/roles">
                <AdminButton variant="outline">
                  <Settings className="h-4 w-4" strokeWidth={1.75} /> Роли и права
                </AdminButton>
              </Link>
              <Link href="/admin/settings/users/new">
                <AdminButton>
                  <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
                </AdminButton>
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-border/70">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/settings/users?tab=${t.key}`}
            className={cn(
              "relative px-3.5 py-2 text-[13.5px] font-medium transition-colors",
              tab === t.key ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key ? <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-ink" /> : null}
          </Link>
        ))}
      </div>

      {tab === "users" ? <UsersTab /> : <AuditLogView searchParams={sp} />}
    </>
  );
}

async function UsersTab() {
  const db = createSupabaseAdminClient();
  const [{ data }, { data: roleData }] = await Promise.all([
    db.from("admin_users").select("id,email,full_name,role,is_active,last_login_at").order("created_at"),
    db.from("admin_roles").select("key,label").order("sort"),
  ]);
  const rows = (data ?? []) as Row[];
  const roles = (roleData ?? []) as { key: string; label: string }[];
  if (rows.length === 0) return <EmptyState title="Нет пользователей" />;
  return (
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
            <TD><RoleSelect id={u.id} role={u.role} roles={roles} /></TD>
            <TD className="whitespace-nowrap text-ink-muted">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—"}</TD>
            <TD><ActiveToggle id={u.id} active={u.is_active} /></TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
