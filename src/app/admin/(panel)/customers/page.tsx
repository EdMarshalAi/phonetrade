import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";

export const metadata: Metadata = { title: "Клиенты" };

const PAGE_SIZE = 25;
const SEGMENT_LABEL: Record<string, string> = { new: "Новый", regular: "Постоянный", vip: "VIP" };

interface Row {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
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

  let query = db.from("customers").select("id,name,phone,email,total_orders,total_spent,segment", { count: "exact" });
  if (sp.segment) query = query.eq("segment", sp.segment);
  if (sp.q) query = query.or(`name.ilike.%${sp.q}%,phone.ilike.%${sp.q}%,email.ilike.%${sp.q}%`);
  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("total_spent", { ascending: false }).range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Клиенты" description={`База клиентов. Всего: ${total}.`} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Имя, телефон, email…" />
        <FilterSelect param="segment" allLabel="Все сегменты" options={Object.entries(SEGMENT_LABEL).map(([value, label]) => ({ value, label }))} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Клиентов пока нет" hint="Клиенты появляются автоматически при оформлении заказов." />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Имя</TH>
              <TH className="w-40">Телефон</TH>
              <TH className="w-24">Заказов</TH>
              <TH className="w-32">Сумма</TH>
              <TH className="w-28">Сегмент</TH>
              <TH className="w-px text-right" />
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name || "—"}</TD>
                  <TD className="text-ink-muted">{c.phone || "—"}</TD>
                  <TD className="text-ink-muted">{c.total_orders}</TD>
                  <TD className="font-medium">{new Intl.NumberFormat("ru-RU").format(c.total_spent)} ₽</TD>
                  <TD><StatusBadge tone={c.segment === "vip" ? "strong" : "neutral"}>{SEGMENT_LABEL[c.segment] ?? c.segment}</StatusBadge></TD>
                  <TD className="text-right">
                    <Link href={`/admin/customers/${c.id}`}>
                      <AdminButton variant="outline" size="sm">Открыть</AdminButton>
                    </Link>
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
