import type { Metadata } from "next";
import Link from "next/link";
import { Send, Zap } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { TimeSeriesChart } from "@/components/admin/Charts";
import { daysAgoISO } from "@/lib/email/since";
import { OverviewTabs } from "./OverviewTabs";

export const metadata: Metadata = { title: "Рассылки — обзор" };

const STATUS_LABEL: Record<string, string> = { sent: "Отправлено", delivered: "Доставлено", opened: "Открыто", clicked: "Клик", bounced: "Отказ", failed: "Ошибка", queued: "В очереди", sending: "Отправка", complained: "Спам" };
const STATUS_TONE: Record<string, "neutral" | "strong" | "danger"> = { opened: "strong", clicked: "strong", delivered: "strong", bounced: "danger", failed: "danger", complained: "danger" };
const SEND_FILTERS = [
  { key: "all", label: "Все" }, { key: "sent", label: "Отправленные" }, { key: "opened", label: "Открытые" }, { key: "clicked", label: "С кликом" }, { key: "bounced", label: "Отказы" },
];

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
      <p className="text-[12px] uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export default async function MarketingOverview({ searchParams }: { searchParams: Promise<{ tab?: string; period?: string; status?: string }> }) {
  const sp = await searchParams;
  const tab = ["summary", "sends", "automations"].includes(sp.tab ?? "") ? sp.tab! : "summary";
  const period = ["7", "30", "90", "365"].includes(sp.period ?? "") ? sp.period! : "30";
  const status = sp.status ?? "all";
  const db = createSupabaseAdminClient();
  const since = daysAgoISO(Number(period));

  return (
    <>
      <PageHeader
        title="Рассылки"
        description="Аналитика email: отправки, открытия, клики, триггеры и кампании."
        actions={<Link href="/admin/marketing/campaigns/new"><span className="inline-flex h-10 items-center gap-2 rounded-sm bg-ink px-4 text-[14px] font-medium text-white transition-colors hover:bg-ink/90"><Send className="size-4" /> Создать кампанию</span></Link>}
      />
      <OverviewTabs tab={tab} period={period} />

      {tab === "summary" ? <SummaryTab db={db} since={since} period={period} /> : null}
      {tab === "sends" ? <SendsTab db={db} since={since} status={status} period={period} /> : null}
      {tab === "automations" ? <AutomationsTab db={db} /> : null}
    </>
  );
}

async function SummaryTab({ db, since, period }: { db: ReturnType<typeof createSupabaseAdminClient>; since: string; period: string }) {
  const [subs, sent, delivered, opened, clicked, bounced, tl] = await Promise.all([
    db.from("segment_all_subscribers").select("id", { count: "exact", head: true }),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).in("status", ["sent", "delivered", "opened", "clicked"]),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).in("status", ["delivered", "opened", "clicked"]),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).in("status", ["opened", "clicked"]),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "clicked"),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "bounced"),
    db.rpc("get_email_sends_timeline", { p_days: Number(period) }),
  ]);
  const sN = sent.count ?? 0, oN = opened.count ?? 0, cN = clicked.count ?? 0;
  const timeline = (tl.data ?? []) as { date: string; sent: number; opened: number }[];
  const chart = timeline.map((t) => ({ label: new Date(t.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }), value: t.sent }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Подписчиков" value={(subs.count ?? 0).toLocaleString("ru-RU")} hint="всего" />
        <Metric label="Отправлено" value={sN.toLocaleString("ru-RU")} hint={`за ${period} дн`} />
        <Metric label="Доставлено" value={(delivered.count ?? 0).toLocaleString("ru-RU")} />
        <Metric label="Open rate" value={sN ? `${((oN / sN) * 100).toFixed(1)}%` : "—"} hint={`${oN} открытий`} />
        <Metric label="Click rate" value={sN ? `${((cN / sN) * 100).toFixed(1)}%` : "—"} hint={`${cN} кликов`} />
        <Metric label="Отказы" value={(bounced.count ?? 0).toLocaleString("ru-RU")} />
      </div>
      <h2 className="mb-2 mt-8 text-[15px] font-semibold text-ink">Отправки по дням</h2>
      <div className="rounded-2xl border border-border/60 bg-white p-4">
        {chart.length ? <TimeSeriesChart data={chart} /> : <p className="py-8 text-center text-[13px] text-ink-muted">Пока нет отправок за выбранный период.</p>}
      </div>
    </>
  );
}

async function SendsTab({ db, since, status, period }: { db: ReturnType<typeof createSupabaseAdminClient>; since: string; status: string; period: string }) {
  let q = db.from("email_sends_log").select("recipient_email,recipient_name,subject,status,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(100);
  if (status === "sent") q = q.in("status", ["sent", "delivered", "opened", "clicked"]);
  else if (status === "opened") q = q.in("status", ["opened", "clicked"]);
  else if (status === "clicked") q = q.eq("status", "clicked");
  else if (status === "bounced") q = q.eq("status", "bounced");
  const { data } = await q;
  const rows = (data ?? []) as { recipient_email: string; recipient_name: string | null; subject: string; status: string; created_at: string }[];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {SEND_FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/marketing/overview?tab=sends&period=${period}&status=${f.key}`} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${status === f.key ? "border-ink bg-ink text-white" : "border-border text-ink-muted hover:text-ink"}`}>{f.label}</Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-white py-10 text-center text-[13px] text-ink-muted">Нет отправок за период.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border/60 bg-surface/40 text-[11px] uppercase tracking-wide text-ink-subtle">
              <tr><th className="px-4 py-2.5 text-left font-medium">Получатель</th><th className="px-4 py-2.5 text-left font-medium">Письмо</th><th className="px-4 py-2.5 text-left font-medium">Статус</th><th className="px-4 py-2.5 text-right font-medium">Когда</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 text-ink-muted">{r.recipient_name ? `${r.recipient_name} · ` : ""}{r.recipient_email}</td>
                  <td className="px-4 py-2.5 font-medium text-ink">{r.subject}</td>
                  <td className="px-4 py-2.5"><StatusBadge tone={STATUS_TONE[r.status] ?? "neutral"}>{STATUS_LABEL[r.status] ?? r.status}</StatusBadge></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-ink-subtle">{new Date(r.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

async function AutomationsTab({ db }: { db: ReturnType<typeof createSupabaseAdminClient> }) {
  const [triggers, campaigns] = await Promise.all([
    db.from("email_triggers").select("slug,name,description,is_active").order("event_type").order("step_in_chain"),
    db.from("email_campaigns").select("id,name,status,recipient_count,sent_at").order("created_at", { ascending: false }).limit(8),
  ]);
  const trigs = (triggers.data ?? []) as { slug: string; name: string; description: string | null; is_active: boolean }[];
  const camps = (campaigns.data ?? []) as { id: string; name: string; status: string; recipient_count: number; sent_at: string | null }[];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border/60 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Zap className="size-4" /> Триггеры</h2>
          <Link href="/admin/marketing/triggers" className="text-[13px] font-medium text-ink-muted hover:text-ink">Управление →</Link>
        </div>
        <ul className="divide-y divide-border/60">
          {trigs.map((t) => (
            <li key={t.slug} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0"><p className="truncate text-[14px] font-medium text-ink">{t.name}</p>{t.description ? <p className="truncate text-[12px] text-ink-muted">{t.description}</p> : null}</div>
              {t.is_active ? <StatusBadge tone="strong">Активен</StatusBadge> : <StatusBadge>Выкл</StatusBadge>}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-border/60 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Последние кампании</h2>
          <Link href="/admin/marketing/campaigns" className="text-[13px] font-medium text-ink-muted hover:text-ink">Все →</Link>
        </div>
        {camps.length === 0 ? <p className="py-6 text-center text-[13px] text-ink-muted">Кампаний пока нет.</p> : (
          <ul className="divide-y divide-border/60">
            {camps.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0"><p className="truncate text-[14px] font-medium text-ink">{c.name}</p><p className="text-[12px] text-ink-muted">{c.recipient_count} получателей · {c.sent_at ? new Date(c.sent_at).toLocaleDateString("ru-RU") : "черновик"}</p></div>
                <StatusBadge tone={c.status === "sent" ? "strong" : "neutral"}>{c.status}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
