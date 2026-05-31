import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { EmptyState } from "@/components/admin/table";
import { ListCard, LinkRow } from "@/components/admin/ListRow";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LEAD_TYPE, LEAD_STATUS, leadStatusTone } from "./labels";
import { deleteLead } from "./actions";

const money = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

export const metadata: Metadata = { title: "Заявки" };

const PAGE_SIZE = 25;

interface Row {
  id: string;
  type: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  customer_id: string | null;
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

  let query = db.from("leads").select("id,type,contact_name,contact_phone,contact_email,customer_id,payload,status,created_at", { count: "exact" });
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.q) query = query.or(`contact_name.ilike.%${sp.q}%,contact_phone.ilike.%${sp.q}%`);
  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Кто стоит за заявкой: зарегистрированный клиент или просто оставленный номер.
  const custIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))] as string[];
  const custMap: Record<string, { user_id: string | null }> = {};
  if (custIds.length > 0) {
    const { data: custs } = await db.from("customers").select("id,user_id").in("id", custIds);
    for (const c of (custs ?? []) as { id: string; user_id: string | null }[]) custMap[c.id] = { user_id: c.user_id };
  }

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
          <ListCard>
            {rows.map((r) => {
              const reg = r.customer_id ? (custMap[r.customer_id]?.user_id ? "registered" : "by_phone") : "anon";
              const detail = r.type === "trade_in" && r.payload?.model
                ? `${r.payload.model}${r.payload.estimated_price_rub ? ` · ~${money(r.payload.estimated_price_rub)}` : ""}`
                : LEAD_TYPE[r.type] ?? r.type;
              return (
                <LinkRow
                  key={r.id}
                  href={`/admin/leads/${r.id}`}
                  actions={<DeleteButton action={deleteLead.bind(null, r.id)} itemName={`заявку ${r.contact_name || r.contact_phone || ""}`} iconOnly />}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-ink">{r.contact_name || "Без имени"}</span>
                      <span className="shrink-0 rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{LEAD_TYPE[r.type] ?? r.type}</span>
                      {reg === "registered" ? (
                        <span className="shrink-0 rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">рег.</span>
                      ) : reg === "anon" ? (
                        <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-subtle">аноним</span>
                      ) : null}
                    </div>
                    <div className="truncate text-[12.5px] text-ink-muted">
                      {r.contact_phone || "—"}{detail ? ` · ${detail}` : ""}
                    </div>
                  </div>
                  <div className="hidden shrink-0 whitespace-nowrap text-right text-[12px] text-ink-subtle md:block">{fmtDate(r.created_at)}</div>
                  <StatusBadge tone={leadStatusTone(r.status)}>{LEAD_STATUS[r.status] ?? r.status}</StatusBadge>
                </LinkRow>
              );
            })}
          </ListCard>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  );
}
