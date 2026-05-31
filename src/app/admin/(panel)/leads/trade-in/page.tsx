import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";
import { TRADE_IN_STATUS_LABELS } from "@/lib/trade-in/options";
import { TradeInLeadActions } from "./TradeInLeadActions";

export const metadata: Metadata = { title: "Заявки Trade-in" };

const PAGE_SIZE = 25;
const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const money = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("ru-RU").format(n) + " ₽");

interface Row {
  id: string; lead_number: string; created_at: string;
  customer_name: string; customer_phone: string;
  model_title: string; memory_gb: number;
  estimated_price_rub: number; final_price_rub: number | null;
  status: string; has_breakage: boolean; breakage_description: string | null;
}

export default async function TradeInLeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db.from("trade_in_leads").select("id,lead_number,created_at,customer_name,customer_phone,model_title,memory_gb,estimated_price_rub,final_price_rub,status,has_breakage,breakage_description", { count: "exact" });
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.q) query = query.or(`customer_name.ilike.%${sp.q}%,customer_phone.ilike.%${sp.q}%,lead_number.ilike.%${sp.q}%`);
  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Заявки Trade-in" description={`Заявки на выкуп с квиза /trade-in. Всего: ${total}.`} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Имя, телефон, № заявки…" />
        <FilterSelect param="status" allLabel="Все статусы" options={Object.entries(TRADE_IN_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Заявок пока нет" hint="Заявки приходят с публичного калькулятора /trade-in." />
      ) : (
        <>
          <Table>
            <THead>
              <TH className="w-28">№ / дата</TH>
              <TH>Клиент</TH>
              <TH>Модель</TH>
              <TH className="w-28">Предв. цена</TH>
              <TH className="w-28">Статус</TH>
              <TH className="text-right">Действия</TH>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <span className="font-medium">{r.lead_number}</span>
                    <span className="mt-0.5 block whitespace-nowrap text-[11px] text-ink-subtle">{dateFmt.format(new Date(r.created_at))}</span>
                  </TD>
                  <TD>
                    <span className="font-medium">{r.customer_name}</span>
                    <span className="block text-[12px] text-ink-muted">{r.customer_phone}</span>
                  </TD>
                  <TD>
                    <span>{r.model_title} {r.memory_gb}GB</span>
                    {r.has_breakage ? <span className="mt-0.5 block max-w-xs truncate text-[11px] text-sale">поломка: {r.breakage_description}</span> : null}
                  </TD>
                  <TD className="tabular-nums">
                    {money(r.estimated_price_rub)}
                    {r.final_price_rub != null ? <span className="block text-[11px] text-emerald-700">факт: {money(r.final_price_rub)}</span> : null}
                  </TD>
                  <TD><StatusBadge tone={r.status === "completed" ? "strong" : r.status === "rejected" || r.status === "cancelled" ? "danger" : "neutral"}>{TRADE_IN_STATUS_LABELS[r.status] ?? r.status}</StatusBadge></TD>
                  <TD><TradeInLeadActions id={r.id} status={r.status} finalPrice={r.final_price_rub} /></TD>
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
