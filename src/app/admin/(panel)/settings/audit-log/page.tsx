import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { FilterSelect, Pagination } from "@/components/admin/ListControls";

export const metadata: Metadata = { title: "Журнал аудита" };

const PAGE_SIZE = 40;
const ACTION_LABEL: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
  login: "Вход",
  logout: "Выход",
  status_change: "Смена статуса",
};

interface Row {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  user_id: string | null;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db.from("admin_audit_log").select("id,action,entity_type,entity_id,created_at,user_id", { count: "exact" });
  if (sp.action) query = query.eq("action", sp.action);
  if (sp.entity) query = query.eq("entity_type", sp.entity);
  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);
  const rows = (data ?? []) as Row[];

  // имена пользователей
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: users } = await db.from("admin_users").select("id,full_name,email").in("id", ids);
    for (const u of (users ?? []) as { id: string; full_name: string; email: string }[]) {
      names[u.id] = u.full_name || u.email;
    }
  }

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Журнал аудита" description={`Все действия в админке. Записей: ${total}.`} />
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect param="action" allLabel="Все действия" options={Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))} />
        <FilterSelect param="entity" allLabel="Все сущности" options={["product", "category", "brand", "order", "lead", "hero_slide", "advantage", "trade_in_block", "trade_in_step"].map((v) => ({ value: v, label: v }))} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Записей нет" />
      ) : (
        <>
          <Table>
            <THead>
              <TH className="w-44">Время (МСК)</TH>
              <TH>Пользователь</TH>
              <TH className="w-36">Действие</TH>
              <TH>Сущность</TH>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="text-ink-muted">{new Date(r.created_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</TD>
                  <TD>{r.user_id ? names[r.user_id] ?? r.user_id.slice(0, 8) : "—"}</TD>
                  <TD><StatusBadge>{ACTION_LABEL[r.action] ?? r.action}</StatusBadge></TD>
                  <TD className="text-ink-muted">{r.entity_type}{r.entity_id ? ` · ${r.entity_id}` : ""}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  );
}
