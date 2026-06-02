import type { Metadata } from "next";
import Link from "next/link";
import { Send, Zap } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { daysAgoISO } from "@/lib/email/since";

export const metadata: Metadata = { title: "Рассылки — обзор" };

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
      <p className="text-[12px] uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export default async function MarketingOverview() {
  const db = createSupabaseAdminClient();
  const since = daysAgoISO(30);

  const [subs, sentRes, openedRes, clickedRes, triggers, campaigns] = await Promise.all([
    db.from("segment_all_subscribers").select("id", { count: "exact", head: true }),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).in("status", ["sent", "delivered", "opened", "clicked"]),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).in("status", ["opened", "clicked"]),
    db.from("email_sends_log").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "clicked"),
    db.from("email_triggers").select("slug,name,description,is_active").order("step_in_chain"),
    db.from("email_campaigns").select("id,name,status,recipient_count,sent_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const subsN = subs.count ?? 0;
  const sentN = sentRes.count ?? 0;
  const openN = openedRes.count ?? 0;
  const clickN = clickedRes.count ?? 0;
  const openRate = sentN ? `${((openN / sentN) * 100).toFixed(1)}%` : "—";
  const clickRate = sentN ? `${((clickN / sentN) * 100).toFixed(1)}%` : "—";

  const trigs = (triggers.data ?? []) as { slug: string; name: string; description: string | null; is_active: boolean }[];
  const camps = (campaigns.data ?? []) as { id: string; name: string; status: string; recipient_count: number; sent_at: string | null }[];

  return (
    <>
      <PageHeader
        title="Рассылки"
        description="Автоматические триггеры, ручные кампании и аналитика email."
        actions={
          <Link href="/admin/marketing/campaigns/new">
            <span className="inline-flex h-10 items-center gap-2 rounded-sm bg-ink px-4 text-[14px] font-medium text-white transition-colors hover:bg-ink/90"><Send className="size-4" /> Создать кампанию</span>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Подписчиков" value={subsN.toLocaleString("ru-RU")} hint="с согласием на маркетинг" />
        <Metric label="Отправлено / 30 дн" value={sentN.toLocaleString("ru-RU")} />
        <Metric label="Open rate / 30 дн" value={openRate} hint={`${openN} открытий`} />
        <Metric label="Click rate / 30 дн" value={clickRate} hint={`${clickN} кликов`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Zap className="size-4" /> Триггеры</h2>
            <Link href="/admin/marketing/triggers" className="text-[13px] font-medium text-ink-muted hover:text-ink">Управление →</Link>
          </div>
          <ul className="divide-y divide-border/60">
            {trigs.map((t) => (
              <li key={t.slug} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{t.name}</p>
                  {t.description ? <p className="truncate text-[12px] text-ink-muted">{t.description}</p> : null}
                </div>
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
          {camps.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-muted">Кампаний пока нет.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {camps.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{c.name}</p>
                    <p className="text-[12px] text-ink-muted">{c.recipient_count} получателей · {c.sent_at ? new Date(c.sent_at).toLocaleDateString("ru-RU") : "черновик"}</p>
                  </div>
                  <StatusBadge tone={c.status === "sent" ? "strong" : "neutral"}>{c.status}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
