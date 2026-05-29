import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";
import { ORDER_STATUS, orderStatusTone, PAYMENT_LABEL, DELIVERY_LABEL } from "./labels";

export const metadata: Metadata = { title: "Заказы" };

const PAGE_SIZE = 25;

interface Row {
  id: string;
  order_number: string | null;
  created_at: string;
  customer_name: string | null;
  phone: string | null;
  total: number;
  payment_method: string | null;
  delivery_method: string | null;
  status: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function money(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db
    .from("orders")
    .select("id,order_number,created_at,customer_name,phone,total,payment_method,delivery_method,status", { count: "exact" })
    .is("deleted_at", null);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.payment) query = query.eq("payment_method", sp.payment);
  if (sp.q) query = query.or(`order_number.ilike.%${sp.q}%,phone.ilike.%${sp.q}%,customer_name.ilike.%${sp.q}%`);

  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Заказы"
        description={`Всего: ${total}. Управление статусами и составом.`}
        actions={
          <Link href="/admin/orders/new">
            <AdminButton variant="primary" size="sm">
              <Plus className="h-4 w-4" strokeWidth={1.75} /> Новый заказ
            </AdminButton>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="№ заказа, телефон, имя…" />
        <FilterSelect param="status" allLabel="Все статусы" options={Object.entries(ORDER_STATUS).map(([value, label]) => ({ value, label }))} />
        <FilterSelect param="payment" allLabel="Все оплаты" options={Object.entries(PAYMENT_LABEL).map(([value, label]) => ({ value, label }))} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Заказов пока нет"
          hint="Заказы появятся после оформления на сайте. Запись заказов из корзины в БД подключается отдельно."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TH className="w-28">№</TH>
              <TH className="w-32">Дата</TH>
              <TH>Клиент</TH>
              <TH className="w-28">Сумма</TH>
              <TH className="w-28">Оплата</TH>
              <TH className="w-28">Получение</TH>
              <TH className="w-36">Статус</TH>
              <TH className="w-px text-right" />
            </THead>
            <TBody>
              {rows.map((o) => (
                <TR key={o.id}>
                  <TD className="font-medium">
                    <Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.order_number ?? o.id.slice(0, 8)}</Link>
                  </TD>
                  <TD className="whitespace-nowrap text-ink-muted">{fmtDate(o.created_at)}</TD>
                  <TD>
                    <div>{o.customer_name || "—"}</div>
                    <div className="text-[12px] text-ink-subtle">{o.phone || ""}</div>
                  </TD>
                  <TD className="font-medium">{money(o.total)}</TD>
                  <TD className="text-ink-muted">{o.payment_method ? PAYMENT_LABEL[o.payment_method] ?? o.payment_method : "—"}</TD>
                  <TD className="text-ink-muted">{o.delivery_method ? DELIVERY_LABEL[o.delivery_method] ?? o.delivery_method : "—"}</TD>
                  <TD><StatusBadge tone={orderStatusTone(o.status)}>{ORDER_STATUS[o.status] ?? o.status}</StatusBadge></TD>
                  <TD className="text-right">
                    <Link href={`/admin/orders/${o.id}`}>
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
