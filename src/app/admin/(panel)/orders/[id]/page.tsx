import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { OrderStatusControl, OrderNotes } from "../OrderControls";
import { deleteOrder } from "../actions";
import { ORDER_STATUS, PAYMENT_LABEL, DELIVERY_LABEL, PAYMENT_STATUS_LABEL } from "../labels";
import { getOrderStatusConfig } from "@/lib/orders/status-config";
import { statusBadgeStyle, ORDER_BADGE_BASE } from "@/lib/orders/statuses";

export const metadata: Metadata = { title: "Заказ" };

function money(n: number | null): string {
  return new Intl.NumberFormat("ru-RU").format(n ?? 0) + " ₽";
}
function dt(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data: order } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: history }, statuses] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", id),
    db.from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    getOrderStatusConfig(),
  ]);
  const orderItems = (items ?? []) as Record<string, unknown>[];
  const log = (history ?? []) as Record<string, unknown>[];
  const labelOf = (k: string) => statuses.find((s) => s.key === k)?.label ?? ORDER_STATUS[k] ?? k;
  const colorOf = (k: string) => statuses.find((s) => s.key === k)?.color ?? "slate";

  return (
    <>
      <PageHeader
        title={`Заказ ${order.order_number ?? id.slice(0, 8)}`}
        description={`Создан ${dt(order.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/orders">
              <AdminButton variant="outline" size="sm"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К списку</AdminButton>
            </Link>
            <DeleteButton action={deleteOrder.bind(null, id)} itemName={`заказ ${order.order_number ?? id.slice(0, 8)}`} label="Удалить" redirectTo="/admin/orders" />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <PanelHeader>
              <PanelTitle>Состав заказа</PanelTitle>
              <span className={ORDER_BADGE_BASE} style={statusBadgeStyle(colorOf(order.status))}>{labelOf(order.status)}</span>
            </PanelHeader>
            {orderItems.length === 0 ? (
              <div className="p-5 text-sm text-ink-muted">Позиции не записаны (заказ создан без детализации).</div>
            ) : (
              <Table>
                <THead>
                  <TH>Товар</TH>
                  <TH className="w-20">Кол-во</TH>
                  <TH className="w-28">Цена</TH>
                  <TH className="w-28">Итого</TH>
                </THead>
                <TBody>
                  {orderItems.map((it, i) => (
                    <TR key={(it.id as string) ?? i}>
                      <TD className="font-medium">{(it.title as string) || (it.product_id as string)}</TD>
                      <TD className="text-ink-muted">{(it.qty as number) ?? 1}</TD>
                      <TD className="text-ink-muted">{money((it.applied_price as number) ?? (it.price_cash as number))}</TD>
                      <TD className="font-medium">{money((it.total as number) ?? ((it.price_cash as number) ?? 0) * ((it.qty as number) ?? 1))}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Panel>

          <div className="grid gap-5 sm:grid-cols-2">
            <Panel>
              <PanelHeader>
                <PanelTitle>Клиент</PanelTitle>
                {order.customer_id ? (
                  <Link href={`/admin/customers/${order.customer_id}`}>
                    <AdminButton variant="outline" size="sm">Карточка клиента</AdminButton>
                  </Link>
                ) : null}
              </PanelHeader>
              <div className="space-y-1.5 p-5 text-[14px]">
                <div>{order.customer_name || "—"}</div>
                <div className="text-ink-muted">{order.phone || order.customer_phone || ""}</div>
                <div className="text-ink-muted">{order.customer_email || ""}</div>
                <div className="text-[12px] text-ink-subtle">{order.customer_type === "legal" ? "Юр. лицо" : "Физ. лицо"}</div>
              </div>
            </Panel>
            <Panel>
              <PanelHeader><PanelTitle>Доставка и оплата</PanelTitle></PanelHeader>
              <div className="space-y-1.5 p-5 text-[14px]">
                <div>Получение: <span className="text-ink-muted">{order.delivery_method ? DELIVERY_LABEL[order.delivery_method] ?? order.delivery_method : (order.delivery || "—")}</span></div>
                {order.delivery_address ? <div className="text-ink-muted">{order.delivery_address}</div> : null}
                <div>Оплата: <span className="text-ink-muted">{order.payment_method ? PAYMENT_LABEL[order.payment_method] ?? order.payment_method : "—"}</span></div>
                <div>Статус оплаты: <span className="text-ink-muted">{PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}</span></div>
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHeader><PanelTitle>История статусов</PanelTitle></PanelHeader>
            {log.length === 0 ? (
              <div className="p-5 text-sm text-ink-muted">Изменений пока нет.</div>
            ) : (
              <ul className="divide-y divide-border/60">
                {log.map((h, i) => (
                  <li key={(h.id as string) ?? i} className="flex items-center justify-between gap-4 px-5 py-2.5 text-[13.5px]">
                    <span>
                      {h.from_status ? `${labelOf(h.from_status as string)} → ` : ""}
                      <span className="font-medium">{labelOf(h.to_status as string)}</span>
                      {h.comment ? <span className="text-ink-muted"> · {h.comment as string}</span> : null}
                    </span>
                    <span className="shrink-0 text-ink-subtle">{dt(h.created_at as string)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader><PanelTitle>Заметки менеджера</PanelTitle></PanelHeader>
            <div className="p-5"><OrderNotes id={id} initial={order.manager_notes ?? ""} /></div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelHeader><PanelTitle>Итого</PanelTitle></PanelHeader>
            <div className="space-y-1.5 p-5 text-[14px]">
              <div className="flex justify-between"><span className="text-ink-muted">Товары</span><span>{money(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Скидка за наличные</span><span>−{money(order.discount_cash)}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Промо</span><span>−{money(order.discount_promo)}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Доставка</span><span>{money(order.delivery_cost)}</span></div>
              <div className="mt-2 flex justify-between border-t border-border/60 pt-2 text-[16px] font-semibold"><span>Итого</span><span>{money(order.total)}</span></div>
            </div>
          </Panel>
          <Panel>
            <PanelHeader><PanelTitle>Смена статуса</PanelTitle></PanelHeader>
            <div className="p-5"><OrderStatusControl id={id} status={order.status} statuses={statuses} /></div>
          </Panel>
        </div>
      </div>
    </>
  );
}
