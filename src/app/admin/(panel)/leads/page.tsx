import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LEAD_TYPE, LEAD_STATUS, leadStatusTone } from "./labels";
import { PhoneCell } from "./PhoneCell";
import { deleteLead } from "./actions";

export const metadata: Metadata = { title: "Заявки" };

const PAGE_SIZE = 25;

interface Row {
  id: string;
  type: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payload: { model?: string; estimated_price_rub?: number; lead_number?: string } | null;
  status: string;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db.from("leads").select("id,type,contact_name,contact_phone,contact_email,payload,status,created_at", { count: "exact" });
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.q) query = query.or(`contact_name.ilike.%${sp.q}%,contact_phone.ilike.%${sp.q}%`);
  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Заявки" description={`Обращения с сайта: trade-in, звонки, вопросы. Всего: ${total}.`} />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Имя или телефон…" />
        <FilterSelect param="type" allLabel="Все типы" options={Object.entries(LEAD_TYPE).map(([value, label]) => ({ value, label }))} />
        <FilterSelect param="status" allLabel="Все статусы" options={Object.entries(LEAD_STATUS).map(([value, label]) => ({ value, label }))} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Заявок пока нет" hint="Заявки приходят с форм сайта (trade-in, обратный звонок)." />
      ) : (
        <>
          <Table>
            <THead>
              <TH className="w-36">Дата</TH>
              <TH className="w-40">Тип</TH>
              <TH>Контакт</TH>
              <TH className="w-36">Статус</TH>
              <TH className="w-px text-right">Действия</TH>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap text-ink-muted">{fmtDate(r.created_at)}</TD>
                  <TD>
                    {LEAD_TYPE[r.type] ?? r.type}
                    {r.type === "trade_in" && r.payload?.model ? (
                      <span className="mt-0.5 block text-[11px] text-ink-subtle">{r.payload.model}{r.payload.estimated_price_rub ? ` · ~${new Intl.NumberFormat("ru-RU").format(r.payload.estimated_price_rub)} ₽` : ""}</span>
                    ) : null}
                  </TD>
                  <TD>
                    <div className="font-medium">{r.contact_name || "—"}</div>
                    <PhoneCell phone={r.contact_phone} />
                  </TD>
                  <TD>
                    <StatusBadge tone={leadStatusTone(r.status)}>{LEAD_STATUS[r.status] ?? r.status}</StatusBadge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/leads/${r.id}`}>
                        <AdminButton variant="outline" size="sm">Открыть</AdminButton>
                      </Link>
                      <DeleteButton action={deleteLead.bind(null, r.id)} itemName={`заявку ${r.contact_name || r.contact_phone || ""}`} iconOnly />
                    </div>
                  </TD>
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
