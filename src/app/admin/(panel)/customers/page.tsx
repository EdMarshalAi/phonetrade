import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { EmptyState } from "@/components/admin/table";
import Link from "next/link";
import { ListCard, LinkRow } from "@/components/admin/ListRow";
import { formatPhone } from "@/lib/validation/phone";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";
import { ExportCustomers } from "./ExportCustomers";

export const metadata: Metadata = { title: "Клиенты" };

const PAGE_SIZE = 25;
const SEGMENT_LABEL: Record<string, string> = { new: "Новый", regular: "Постоянный", vip: "VIP" };
const money = (n: number) => new Intl.NumberFormat("ru-RU").format(n ?? 0) + " ₽";

interface Row {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  user_id: string | null;
  total_orders: number;
  total_spent: number;
  segment: string;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db.from("customers").select("id,name,phone,email,user_id,total_orders,total_spent,segment", { count: "exact" });
  if (sp.segment) query = query.eq("segment", sp.segment);
  if (sp.no_phone === "1") query = query.is("phone", null);
  if (sp.q) query = query.or(`name.ilike.%${sp.q}%,phone.ilike.%${sp.q}%,email.ilike.%${sp.q}%`);
  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("total_spent", { ascending: false }).range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Клиенты" description={`База клиентов. Всего: ${total}.`} actions={<ExportCustomers />} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Имя, телефон, email…" />
        <FilterSelect param="segment" allLabel="Все сегменты" options={Object.entries(SEGMENT_LABEL).map(([value, label]) => ({ value, label }))} />
        <Link href={sp.no_phone === "1" ? "/admin/customers" : "/admin/customers?no_phone=1"} className={`inline-flex h-9 items-center rounded-sm border px-3 text-[13px] font-medium ${sp.no_phone === "1" ? "border-ink bg-ink text-white" : "border-border text-ink-muted hover:text-ink"}`}>Без телефона</Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Клиентов пока нет" hint="Клиент появляется автоматически, как только оставит номер: заказ, заявка или регистрация." />
      ) : (
        <>
          <ListCard>
            {rows.map((c) => (
              <LinkRow key={c.id} href={`/admin/customers/${c.id}`}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-[13px] font-semibold uppercase text-ink-muted">
                  {(c.name || c.phone || "?").trim().charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink">{c.name || "Без имени"}</span>
                    {c.user_id ? (
                      <span className="shrink-0 rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">рег.</span>
                    ) : null}
                  </div>
                  <div className="truncate text-[12.5px] text-ink-muted">{c.phone ? formatPhone(c.phone) : "—"}{c.email ? ` · ${c.email}` : ""}</div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-[15px] font-semibold tabular-nums text-ink">{money(c.total_spent)}</div>
                  <div className="text-[12px] text-ink-subtle">{c.total_orders} заказ.</div>
                </div>
                <StatusBadge tone={c.segment === "vip" ? "strong" : "neutral"}>{SEGMENT_LABEL[c.segment] ?? c.segment}</StatusBadge>
              </LinkRow>
            ))}
          </ListCard>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  );
}
