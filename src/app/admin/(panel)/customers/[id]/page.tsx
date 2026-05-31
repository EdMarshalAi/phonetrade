import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getOrderStatusConfig } from "@/lib/orders/status-config";
import { LEAD_TYPE, LEAD_STATUS } from "../../leads/labels";
import { CustomerTabs } from "./CustomerTabs";
import { deleteCustomer } from "../actions";

export const metadata: Metadata = { title: "Клиент" };
const SEGMENT_LABEL: Record<string, string> = { new: "Новый", regular: "Постоянный", vip: "VIP" };
const money = (n: number) => new Intl.NumberFormat("ru-RU").format(n ?? 0) + " ₽";
const date = (iso: string) => new Date(iso).toLocaleDateString("ru-RU");

type LeadRow = { id: string; type: string; status: string; created_at: string; payload: { model?: string; estimated_price_rub?: number; request_label?: string } | null };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data: c } = await db.from("customers").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const last10 = (c.phone ?? "").replace(/\D/g, "").slice(-10);
  const consentFilter = last10 ? `customer_id.eq.${id},user_phone.ilike.%${last10}` : `customer_id.eq.${id}`;

  const [{ data: orders }, { data: leadsData }, { data: consentsData }, statuses, prof] = await Promise.all([
    db.from("orders").select("id,order_number,created_at,total,status").eq("customer_id", id).order("created_at", { ascending: false }),
    db.from("leads").select("id,type,status,created_at,payload").eq("customer_id", id).order("created_at", { ascending: false }),
    db.from("data_consents").select("consent_type,given_at,revoked_at").or(consentFilter),
    getOrderStatusConfig(),
    c.user_id ? db.from("profiles").select("id").eq("id", c.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const ordersList = (orders ?? []) as { id: string; order_number: string | null; created_at: string; total: number; status: string }[];
  const leads = (leadsData ?? []) as LeadRow[];
  const tradeInLeads = leads.filter((l) => l.type === "trade_in");
  const inquiries = leads.filter((l) => l.type !== "trade_in");
  const hasAccount = !!(prof as { data: { id: string } | null }).data;

  const statusLabel = (k: string) => statuses.find((s) => s.key === k)?.label ?? k;
  const consents = (consentsData ?? []) as { consent_type: string; revoked_at: string | null }[];
  const hasConsent = (type: string) => consents.some((c2) => c2.consent_type === type && !c2.revoked_at);

  const OrdersTab = ordersList.length === 0 ? (
    <div className="text-sm text-ink-muted">Заказов нет.</div>
  ) : (
    <Table>
      <THead><TH>№</TH><TH>Дата</TH><TH>Сумма</TH><TH>Статус</TH></THead>
      <TBody>
        {ordersList.map((o) => (
          <TR key={o.id}>
            <TD><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number ?? o.id.slice(0, 8)}</Link></TD>
            <TD className="whitespace-nowrap text-ink-muted">{date(o.created_at)}</TD>
            <TD>{money(o.total)}</TD>
            <TD className="text-ink-muted">{statusLabel(o.status)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );

  const InquiriesTab = inquiries.length === 0 ? (
    <div className="text-sm text-ink-muted">Обращений нет.</div>
  ) : (
    <Table>
      <THead><TH>Тип</TH><TH>Детали</TH><TH>Дата</TH><TH>Статус</TH></THead>
      <TBody>
        {inquiries.map((l) => (
          <TR key={l.id}>
            <TD><Link href={`/admin/leads/${l.id}`} className="font-medium hover:underline">{LEAD_TYPE[l.type] ?? l.type}</Link></TD>
            <TD className="text-ink-muted">{l.payload?.request_label || "—"}</TD>
            <TD className="whitespace-nowrap text-ink-muted">{date(l.created_at)}</TD>
            <TD className="text-ink-muted">{LEAD_STATUS[l.status] ?? l.status}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );

  const TradeInTab = tradeInLeads.length === 0 ? (
    <div className="text-sm text-ink-muted">Заявок на trade-in нет.</div>
  ) : (
    <Table>
      <THead><TH>Модель</TH><TH>Оценка</TH><TH>Дата</TH><TH>Статус</TH></THead>
      <TBody>
        {tradeInLeads.map((l) => (
          <TR key={l.id}>
            <TD><Link href={`/admin/leads/${l.id}`} className="font-medium hover:underline">{l.payload?.model || "—"}</Link></TD>
            <TD className="text-ink-muted">{l.payload?.estimated_price_rub ? `~${money(l.payload.estimated_price_rub)}` : "—"}</TD>
            <TD className="whitespace-nowrap text-ink-muted">{date(l.created_at)}</TD>
            <TD className="text-ink-muted">{LEAD_STATUS[l.status] ?? l.status}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );

  return (
    <>
      <PageHeader
        title={c.name || c.phone || "Клиент"}
        description={`${c.total_orders} заказ(ов) · ${money(c.total_spent)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/customers"><AdminButton variant="outline" size="sm"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К списку</AdminButton></Link>
            <DeleteButton action={deleteCustomer.bind(null, id)} itemName={`клиента ${c.name || c.phone || ""}`} label="Удалить" redirectTo="/admin/customers" />
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <PanelHeader><PanelTitle>Контакты</PanelTitle><StatusBadge tone={c.segment === "vip" ? "strong" : "neutral"}>{SEGMENT_LABEL[c.segment] ?? c.segment}</StatusBadge></PanelHeader>
          <div className="space-y-2 p-5 text-[14px]">
            <div className="font-medium">{c.name || "—"}</div>
            <div className="text-ink-muted">{c.phone || ""}</div>
            <div className="text-ink-muted">{c.email || ""}</div>

            <div className="!mt-4 space-y-2 border-t border-border/60 pt-3">
              <Row label="Регистрация на сайте" ok={hasAccount} okText="Есть личный кабинет" noText="Только по номеру (без регистрации)" />
              <Row label="Оферта и политика" ok={hasConsent("offer_acceptance")} okText="Принято" noText="Нет согласия" />
              <Row label="Обработка перс. данных" ok={hasConsent("pd_processing")} okText="Дано" noText="Нет согласия" />
              <Row label="Реклама / рассылки" ok={hasConsent("marketing")} okText="Согласен" noText="Не давал" muted />
            </div>

            {c.notes ? <div className="!mt-3 rounded-sm bg-surface p-2 text-[13px] text-ink-muted">{c.notes}</div> : null}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader><PanelTitle>Путь клиента</PanelTitle></PanelHeader>
          <div className="p-5">
            <CustomerTabs
              items={[
                { label: `Заказы (${ordersList.length})`, content: OrdersTab },
                { label: `Обращения (${inquiries.length})`, content: InquiriesTab },
                { label: `Трейдин (${tradeInLeads.length})`, content: TradeInTab },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, ok, okText, noText, muted }: { label: string; ok: boolean; okText: string; noText: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="text-ink-muted">{label}</span>
      <span className={`inline-flex items-center gap-1 font-medium ${ok ? "text-emerald-700" : muted ? "text-ink-subtle" : "text-sale"}`}>
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {ok ? okText : noText}
      </span>
    </div>
  );
}
