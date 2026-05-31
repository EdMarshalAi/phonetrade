import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { EmptyState } from "@/components/admin/table";
import { ListCard, LinkRow } from "@/components/admin/ListRow";
import { AdminButton } from "@/components/admin/form";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";
import { ORDER_STATUS, orderStatusTone, PAYMENT_LABEL, DELIVERY_LABEL } from "./labels";
import { getOrderStatusConfig } from "@/lib/orders/status-config";

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
  const [{ data, count }, statuses] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, to),
    getOrderStatusConfig(),
  ]);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const labelOf = (k: string) => statuses.find((s) => s.key === k)?.label ?? ORDER_STATUS[k] ?? k;
  const toneOf = (k: string) => statuses.find((s) => s.key === k)?.tone ?? orderStatusTone(k);

  return (
    <>
      <PageHeader
        title="Заказы"
        description={`Всего: ${total}. Управление статусами и составом.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/settings/orders">
              <AdminButton variant="outline" size="sm">
                <Settings2 className="h-4 w-4" strokeWidth={1.75} /> Настройки
              </AdminButton>
            </Link>
            <Link href="/admin/orders/new">
              <AdminButton variant="primary" size="sm">
                <Plus className="h-4 w-4" strokeWidth={1.75} /> Новый заказ
              </AdminButton>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="№ заказа, телефон, имя…" />
        <FilterSelect param="status" allLabel="Все статусы" options={statuses.map((s) => ({ value: s.key, label: s.label }))} />
        <FilterSelect param="payment" allLabel="Все оплаты" options={Object.entries(PAYMENT_LABEL).map(([value, label]) => ({ value, label }))} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Заказов пока нет"
          hint="Заказы появятся после оформления на сайте. Запись заказов из корзины в БД подключается отдельно."
        />
      ) : (
        <>
          <ListCard>
            {rows.map((o) => (
              <LinkRow key={o.id} href={`/admin/orders/${o.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{o.order_number ?? o.id.slice(0, 8)}</span>
                    <span className="shrink-0 text-[12px] text-ink-subtle">{fmtDate(o.created_at)}</span>
                  </div>
                  <div className="truncate text-[12.5px] text-ink-muted">
                    {o.customer_name || "—"}{o.phone ? ` · ${o.phone}` : ""}
                    {o.payment_method ? ` · ${PAYMENT_LABEL[o.payment_method] ?? o.payment_method}` : ""}
                    {o.delivery_method ? ` · ${DELIVERY_LABEL[o.delivery_method] ?? o.delivery_method}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-ink">{money(o.total)}</div>
                <StatusBadge tone={toneOf(o.status)}>{labelOf(o.status)}</StatusBadge>
              </LinkRow>
            ))}
          </ListCard>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  );
}
