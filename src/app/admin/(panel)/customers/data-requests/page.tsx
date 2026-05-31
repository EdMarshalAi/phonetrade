import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { FilterSelect, Pagination } from "@/components/admin/ListControls";
import { DSR_TYPES, DSR_STATUS } from "@/lib/legal/dsr";
import { DataRequestActions } from "./DataRequestActions";

export const metadata: Metadata = { title: "Обращения по данным" };

const PAGE_SIZE = 25;

interface Row {
  id: string;
  request_type: string;
  user_email: string | null;
  user_phone: string | null;
  status: string;
  request_details: string | null;
  response_text: string | null;
  deadline: string;
  completed_at: string | null;
  created_at: string | null;
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function DataRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db
    .from("data_subject_requests")
    .select("id,request_type,user_email,user_phone,status,request_details,response_text,deadline,completed_at,created_at", { count: "exact" });
  if (sp.status) query = query.eq("status", sp.status);
  const [from, to] = rangeFor(page, PAGE_SIZE);
  // Новые/в работе сверху, затем по сроку.
  const { data, count } = await query.order("completed_at", { ascending: true, nullsFirst: true }).order("deadline", { ascending: true }).range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const nowMs = Date.now();

  return (
    <>
      <PageHeader
        title="Обращения по персональным данным"
        description="Запросы субъектов ПД (152-ФЗ): доступ, изменение, удаление, отзыв согласия, выгрузка. Срок ответа — 30 дней."
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          param="status"
          allLabel="Все статусы"
          options={Object.entries(DSR_STATUS).map(([value, label]) => ({ value, label }))}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Обращений пока нет" hint="Заявки поступают из личного кабинета → «Конфиденциальность»." />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Тип</TH>
              <TH>Контакт</TH>
              <TH className="w-32">Срок ответа</TH>
              <TH className="w-28">Статус</TH>
              <TH className="w-px text-right" />
            </THead>
            <TBody>
              {rows.map((r) => {
                const closed = r.status === "done" || r.status === "rejected";
                const overdue = !closed && new Date(r.deadline).getTime() < nowMs;
                return (
                  <TR key={r.id}>
                    <TD>
                      <span className="font-medium">{DSR_TYPES[r.request_type as keyof typeof DSR_TYPES] ?? r.request_type}</span>
                      {r.request_details ? (
                        <span className="mt-0.5 block max-w-md truncate text-[12px] text-ink-muted">{r.request_details}</span>
                      ) : null}
                    </TD>
                    <TD className="text-ink-muted">
                      {r.user_email || "—"}
                      {r.user_phone ? <span className="block text-[12px]">{r.user_phone}</span> : null}
                    </TD>
                    <TD className="whitespace-nowrap">
                      <span className={overdue ? "font-medium text-sale" : "text-ink-muted"}>
                        {dateFmt.format(new Date(r.deadline))}
                      </span>
                      {overdue ? <span className="block text-[11px] text-sale">просрочено</span> : null}
                    </TD>
                    <TD>
                      <StatusBadge tone={r.status === "new" ? "outline" : closed ? "neutral" : "strong"}>
                        {DSR_STATUS[r.status] ?? r.status}
                      </StatusBadge>
                    </TD>
                    <TD className="text-right">
                      <DataRequestActions id={r.id} status={r.status} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  );
}
