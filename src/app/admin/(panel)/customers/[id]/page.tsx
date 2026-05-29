import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";

export const metadata: Metadata = { title: "Клиент" };
const SEGMENT_LABEL: Record<string, string> = { new: "Новый", regular: "Постоянный", vip: "VIP" };
const money = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data: c } = await db.from("customers").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: orders } = await db.from("orders").select("id,order_number,created_at,total,status").eq("customer_id", id).order("created_at", { ascending: false });
  const list = (orders ?? []) as { id: string; order_number: string | null; created_at: string; total: number; status: string }[];

  return (
    <>
      <PageHeader
        title={c.name || c.phone || "Клиент"}
        description={`${c.total_orders} заказ(ов) · ${money(c.total_spent)}`}
        actions={<Link href="/admin/customers"><AdminButton variant="outline" size="sm"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К списку</AdminButton></Link>}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <PanelHeader><PanelTitle>Контакты</PanelTitle><StatusBadge tone={c.segment === "vip" ? "strong" : "neutral"}>{SEGMENT_LABEL[c.segment] ?? c.segment}</StatusBadge></PanelHeader>
          <div className="space-y-1.5 p-5 text-[14px]">
            <div>{c.name || "—"}</div>
            <div className="text-ink-muted">{c.phone || ""}</div>
            <div className="text-ink-muted">{c.email || ""}</div>
            {c.notes ? <div className="mt-2 rounded-sm bg-surface p-2 text-[13px] text-ink-muted">{c.notes}</div> : null}
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <PanelHeader><PanelTitle>История заказов</PanelTitle></PanelHeader>
          {list.length === 0 ? (
            <div className="p-5 text-sm text-ink-muted">Заказов нет.</div>
          ) : (
            <Table>
              <THead><TH>№</TH><TH>Дата</TH><TH>Сумма</TH><TH>Статус</TH></THead>
              <TBody>
                {list.map((o) => (
                  <TR key={o.id}>
                    <TD><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number ?? o.id.slice(0, 8)}</Link></TD>
                    <TD className="text-ink-muted">{new Date(o.created_at).toLocaleDateString("ru-RU")}</TD>
                    <TD>{money(o.total)}</TD>
                    <TD className="text-ink-muted">{o.status}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
