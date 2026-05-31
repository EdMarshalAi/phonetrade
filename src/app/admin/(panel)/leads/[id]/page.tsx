import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, User, Link2, ShoppingBag } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle, StatusBadge } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LeadStatusControl, LeadNotes } from "../LeadControls";
import { deleteLead } from "../actions";
import { LEAD_TYPE, LEAD_STATUS, leadStatusTone } from "../labels";

export const metadata: Metadata = { title: "Заявка" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const payload = (data.payload ?? {}) as Record<string, unknown>;
  const payloadRows = Object.entries(payload);
  const created = new Date(data.created_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

  // Кто оставил заявку: связанный клиент (зарегистрированный или по номеру) либо аноним.
  type LinkedCustomer = { id: string; name: string | null; user_id: string | null };
  let customer: LinkedCustomer | null = null;
  if (data.customer_id) {
    const { data: cust } = await db.from("customers").select("id,name,user_id").eq("id", data.customer_id).maybeSingle();
    customer = (cust as LinkedCustomer | null) ?? null;
  }

  // Build URL for "create order from lead"
  const newOrderParams = new URLSearchParams();
  if (data.contact_name) newOrderParams.set("name", data.contact_name);
  if (data.contact_phone) newOrderParams.set("phone", data.contact_phone);
  if (data.contact_email) newOrderParams.set("email", data.contact_email);
  const newOrderHref = `/admin/orders/new?${newOrderParams.toString()}`;

  return (
    <>
      <PageHeader
        title={`Заявка · ${LEAD_TYPE[data.type] ?? data.type}`}
        description={`Создана ${created}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/leads">
              <AdminButton variant="outline" size="sm"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К списку</AdminButton>
            </Link>
            <Link href={newOrderHref}>
              <AdminButton variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4" strokeWidth={1.75} /> Создать заказ из заявки
              </AdminButton>
            </Link>
            <DeleteButton action={deleteLead.bind(null, id)} itemName="заявку" label="Удалить" redirectTo="/admin/leads" />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <PanelHeader>
              <PanelTitle>Контакты</PanelTitle>
              <StatusBadge tone={leadStatusTone(data.status)}>{LEAD_STATUS[data.status] ?? data.status}</StatusBadge>
            </PanelHeader>
            <div className="space-y-2.5 p-5 text-[14px]">
              <div className="flex items-center gap-2.5"><User className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} /> {data.contact_name || "—"}</div>
              <div className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} /> {data.contact_phone ? <a href={`tel:${data.contact_phone}`} className="text-ink hover:underline">{data.contact_phone}</a> : "—"}</div>
              <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} /> {data.contact_email ? <a href={`mailto:${data.contact_email}`} className="text-ink hover:underline">{data.contact_email}</a> : "—"}</div>
              {data.source_url ? (
                <div className="flex items-center gap-2.5"><Link2 className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} /> <span className="truncate text-ink-muted">{data.source_url}</span></div>
              ) : null}
            </div>
          </Panel>

          {payloadRows.length > 0 ? (
            <Panel>
              <PanelHeader><PanelTitle>Детали заявки</PanelTitle></PanelHeader>
              <div className="divide-y divide-border/60">
                {payloadRows.map(([k, v]) => (
                  <div key={k} className="flex gap-4 px-5 py-2.5 text-[14px]">
                    <span className="w-40 shrink-0 text-ink-subtle">{k}</span>
                    <span className="text-ink">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader><PanelTitle>Заметки менеджера</PanelTitle></PanelHeader>
            <div className="p-5">
              <LeadNotes id={id} initial={data.notes ?? ""} />
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelHeader><PanelTitle>Статус</PanelTitle></PanelHeader>
            <div className="p-5">
              <LeadStatusControl id={id} status={data.status} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader><PanelTitle>Клиент</PanelTitle></PanelHeader>
            <div className="space-y-3 p-5 text-[14px]">
              {customer ? (
                <>
                  <StatusBadge tone={customer.user_id ? "strong" : "neutral"}>
                    {customer.user_id ? "Зарегистрирован на сайте" : "Только по номеру"}
                  </StatusBadge>
                  <div>{customer.name || data.contact_name || "—"}</div>
                  <Link href={`/admin/customers/${customer.id}`}>
                    <AdminButton variant="outline" size="sm">Открыть карточку клиента</AdminButton>
                  </Link>
                </>
              ) : (
                <span className="text-[13px] text-ink-muted">Заявка оставлена без авторизации.</span>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
