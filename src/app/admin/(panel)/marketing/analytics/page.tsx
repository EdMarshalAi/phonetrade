import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { daysAgoISO } from "@/lib/email/since";

export const metadata: Metadata = { title: "Рассылки — аналитика" };

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5">
      <p className="text-[12px] uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = { sent: "Отправлено", delivered: "Доставлено", opened: "Открыто", clicked: "Клик", bounced: "Отказ", failed: "Ошибка", queued: "В очереди", sending: "Отправка", complained: "Спам" };

export default async function AnalyticsPage() {
  const db = createSupabaseAdminClient();
  const since = daysAgoISO(30);
  const [total, sent, opened, clicked, bounced, recent] = await Promise.all([
    db.from("email_sends_log").select("id", { count: "exact", head: true }),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).in("status", ["sent", "delivered", "opened", "clicked"]),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).in("status", ["opened", "clicked"]),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "clicked"),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "bounced"),
    db.from("email_sends_log").select("recipient_email,subject,status,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const s = sent.count ?? 0;
  const rows = (recent.data ?? []) as { recipient_email: string; subject: string; status: string; created_at: string }[];

  return (
    <>
      <PageHeader title="Аналитика рассылок" description="Отправки и вовлечённость за последние 30 дней." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Metric label="Всего отправлено" value={(total.count ?? 0).toLocaleString("ru-RU")} />
        <Metric label="За 30 дней" value={s.toLocaleString("ru-RU")} />
        <Metric label="Open rate" value={s ? `${(((opened.count ?? 0) / s) * 100).toFixed(1)}%` : "—"} />
        <Metric label="Click rate" value={s ? `${(((clicked.count ?? 0) / s) * 100).toFixed(1)}%` : "—"} />
        <Metric label="Отказы" value={(bounced.count ?? 0).toLocaleString("ru-RU")} />
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Последние отправки</h2>
      {rows.length === 0 ? (
        <EmptyState title="Отправок пока нет" hint="Здесь появятся письма по мере отправки." />
      ) : (
        <Table>
          <THead>
            <TH>Получатель</TH>
            <TH>Тема</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-36 whitespace-nowrap">Когда</TH>
          </THead>
          <TBody>
            {rows.map((r, i) => (
              <TR key={i}>
                <TD className="text-ink-muted">{r.recipient_email}</TD>
                <TD className="font-medium">{r.subject}</TD>
                <TD className="text-ink-muted">{STATUS_LABEL[r.status] ?? r.status}</TD>
                <TD className="whitespace-nowrap text-ink-muted">{new Date(r.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
