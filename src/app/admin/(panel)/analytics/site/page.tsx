import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart, DonutChart, BarsChart, type SeriesPoint } from "@/components/admin/Charts";
import { FilterSelect } from "@/components/admin/ListControls";

export const metadata: Metadata = { title: "Аналитика сайта" };

/* ── helpers ─────────────────────────────────────────────────────────────── */

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Классифицирует referrer/utm в 5 каналов. */
function classifySource(referrer: string | null, utm: Record<string, string> | null): string {
  const medium = utm?.utm_medium ?? utm?.medium ?? "";
  const source = utm?.utm_source ?? utm?.source ?? "";
  if (medium === "cpc" || medium === "paid" || source === "google_ads" || source === "yandex_direct") return "Реклама";
  if (medium === "social" || source === "vk" || source === "telegram" || source === "instagram" || source === "facebook") return "Соцсети";
  if (!referrer && !source) return "Прямые";
  if (referrer) {
    const host = (() => { try { return new URL(referrer).hostname; } catch { return ""; } })();
    if (host.includes("google") || host.includes("yandex") || host.includes("bing") || host.includes("mail.ru")) return "Поиск";
    if (host.includes("vk.com") || host.includes("t.me") || host.includes("instagram") || host.includes("facebook")) return "Соцсети";
    if (host) return "Реферал";
  }
  return "Прямые";
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function pct(a: number, b: number): string {
  if (!b) return "0%";
  return `${((a / b) * 100).toFixed(1)}%`;
}

/* ── KPI card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[12px] text-ink-subtle">{sub}</p> : null}
    </div>
  );
}

/* ── generic empty wrapper ───────────────────────────────────────────────── */
function ChartEmpty() {
  return (
    <EmptyState
      title="Данных пока нет"
      hint="Копятся по мере трафика на сайте."
    />
  );
}

/* ── funnel step row ─────────────────────────────────────────────────────── */
function FunnelRow({
  label,
  count,
  fromFirst,
  dropOff,
}: {
  label: string;
  count: number;
  fromFirst: string;
  dropOff: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-ink truncate">{label}</p>
      </div>
      <span className="text-[14px] font-medium text-ink w-16 text-right">{fmt(count)}</span>
      <span className="text-[13px] text-ink-muted w-14 text-right">{fromFirst}</span>
      <span className="text-[12px] text-ink-subtle w-14 text-right">{dropOff}</span>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default async function SiteAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin(["admin","manager","analytics"]);

  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const since = sinceIso(days);

  const db = createSupabaseAdminClient();

  // Parallel DB fetches
  const [
    { data: viewsRaw },
    { data: sessionsRaw },
    { count: leadsCount },
    { count: ordersCount },
    { data: funnelRaw },
    { data: searchRaw },
    { data: heroEventsRaw },
    { data: heroSlidesRaw },
  ] = await Promise.all([
    db
      .from("page_views")
      .select("path,referrer,utm,session_id,visitor_id,device_type,city,created_at")
      .gte("created_at", since)
      .limit(5000),
    db
      .from("sessions")
      .select("id,is_bounce,pages_count")
      .gte("created_at", since)
      .limit(10000),
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    db
      .from("funnel_events")
      .select("event_type,session_id,created_at")
      .gte("created_at", since)
      .limit(20000),
    db
      .from("search_queries")
      .select("query,normalized_query,results_count,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    db
      .from("hero_slide_events")
      .select("slide_id,event_type,created_at")
      .gte("created_at", since)
      .limit(10000),
    db.from("hero_slides").select("id,title"),
  ]);

  // ── Normalise rows ────────────────────────────────────────────────────────
  type ViewRow = {
    path: string;
    referrer: string | null;
    utm: Record<string, string> | null;
    session_id: string | null;
    visitor_id: string | null;
    device_type: string | null;
    city: string | null;
    created_at: string;
  };
  const views: ViewRow[] = (viewsRaw ?? []) as ViewRow[];

  type SessionRow = { id: string; is_bounce: boolean | null; pages_count: number | null };
  const sessions: SessionRow[] = (sessionsRaw ?? []) as SessionRow[];

  type FunnelRow2 = { event_type: string; session_id: string | null; created_at: string };
  const funnelEvents: FunnelRow2[] = (funnelRaw ?? []) as FunnelRow2[];

  type SearchRow = { query: string; normalized_query: string | null; results_count: number; created_at: string };
  const searchRows: SearchRow[] = (searchRaw ?? []) as SearchRow[];

  type HeroEvent = { slide_id: string | null; event_type: string; created_at: string };
  const heroEvents: HeroEvent[] = (heroEventsRaw ?? []) as HeroEvent[];

  type HeroSlide = { id: string; title: string | null };
  const heroSlides: HeroSlide[] = (heroSlidesRaw ?? []) as HeroSlide[];

  // ── KPIs ─────────────────────────────────────────────────────────────────

  // Unique visitors (prefer visitor_id, fallback session_id)
  const uniqueVisitors = new Set(views.map((v) => v.visitor_id ?? v.session_id)).size;
  const totalPageViews = views.length;

  // Sessions
  const totalSessions = sessions.length;
  const bounceSessions = sessions.filter((s) => s.is_bounce).length;
  const bounceRate = totalSessions > 0 ? (bounceSessions / totalSessions) * 100 : 0;

  // Avg depth: page_views / sessions (or from pages_count avg)
  const avgDepth =
    totalSessions > 0
      ? (totalPageViews / totalSessions).toFixed(1)
      : "—";

  // Conversion
  const convRate =
    uniqueVisitors > 0 ? (((ordersCount ?? 0) / uniqueVisitors) * 100).toFixed(2) : "0.00";

  // ── Views by day ─────────────────────────────────────────────────────────
  const byDay: Record<string, number> = {};
  for (const v of views) {
    const d = v.created_at.slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + 1;
  }
  const dayLabels = lastNDays(days);
  const viewsByDay: SeriesPoint[] = dayLabels.map((d) => ({
    label: d.slice(5).replace("-", "."),
    value: byDay[d] ?? 0,
  }));

  // ── Funnel ───────────────────────────────────────────────────────────────
  const FUNNEL_STEPS: { key: string; label: string }[] = [
    { key: "view_page", label: "Просмотр страницы" },
    { key: "view_product", label: "Просмотр товара" },
    { key: "add_to_cart", label: "Добавление в корзину" },
    { key: "begin_checkout", label: "Начало оформления" },
    { key: "submit_order", label: "Отправка заказа" },
    { key: "pay_order", label: "Оплата заказа" },
  ];
  const funnelCounts: Record<string, number> = {};
  for (const ev of funnelEvents) {
    funnelCounts[ev.event_type] = (funnelCounts[ev.event_type] ?? 0) + 1;
  }
  const funnelStepsData = FUNNEL_STEPS.map((s) => ({ ...s, count: funnelCounts[s.key] ?? 0 }));
  const funnelFirst = funnelStepsData[0]?.count ?? 0;
  const hasFunnel = funnelStepsData.some((s) => s.count > 0);

  // ── Traffic sources ───────────────────────────────────────────────────────
  const sourceCount: Record<string, number> = {};
  for (const v of views) {
    const src = classifySource(v.referrer, v.utm);
    sourceCount[src] = (sourceCount[src] ?? 0) + 1;
  }
  const sourceData: SeriesPoint[] = Object.entries(sourceCount)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  // ── Top pages ─────────────────────────────────────────────────────────────
  const pathViews: Record<string, number> = {};
  const pathVisitors: Record<string, Set<string>> = {};
  for (const v of views) {
    pathViews[v.path] = (pathViews[v.path] ?? 0) + 1;
    if (!pathVisitors[v.path]) pathVisitors[v.path] = new Set();
    pathVisitors[v.path].add(v.visitor_id ?? v.session_id ?? "");
  }
  const topPages = Object.entries(pathViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, pv]) => ({ path, views: pv, visitors: pathVisitors[path]?.size ?? 0 }));

  // ── Devices ───────────────────────────────────────────────────────────────
  const deviceCount: Record<string, number> = {};
  for (const v of views) {
    const d = v.device_type ?? "—";
    deviceCount[d] = (deviceCount[d] ?? 0) + 1;
  }
  const DEVICE_LABELS: Record<string, string> = { desktop: "Десктоп", mobile: "Мобильный", tablet: "Планшет", "—": "Неизвестно" };
  const deviceData: SeriesPoint[] = Object.entries(deviceCount)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: DEVICE_LABELS[k] ?? k, value: v }));

  // ── Search queries ────────────────────────────────────────────────────────
  const queryCount: Record<string, number> = {};
  for (const s of searchRows) {
    const key = s.normalized_query ?? s.query;
    queryCount[key] = (queryCount[key] ?? 0) + 1;
  }
  const topQueries = Object.entries(queryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  const noResultQueries: Record<string, number> = {};
  for (const s of searchRows.filter((r) => r.results_count === 0)) {
    const key = s.normalized_query ?? s.query;
    noResultQueries[key] = (noResultQueries[key] ?? 0) + 1;
  }
  const topNoResult = Object.entries(noResultQueries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // ── Hero CTR ──────────────────────────────────────────────────────────────
  const heroSlideMap = Object.fromEntries(heroSlides.map((s) => [s.id, s.title ?? s.id]));
  const heroViews: Record<string, number> = {};
  const heroClicks: Record<string, number> = {};
  for (const ev of heroEvents) {
    const sid = ev.slide_id ?? "unknown";
    if (ev.event_type === "view") heroViews[sid] = (heroViews[sid] ?? 0) + 1;
    else if (ev.event_type === "click") heroClicks[sid] = (heroClicks[sid] ?? 0) + 1;
  }
  const heroRows = Object.keys({ ...heroViews, ...heroClicks })
    .map((id) => ({
      id,
      title: heroSlideMap[id] ?? id,
      views: heroViews[id] ?? 0,
      clicks: heroClicks[id] ?? 0,
      ctr: heroViews[id] ? (((heroClicks[id] ?? 0) / heroViews[id]) * 100).toFixed(1) + "%" : "—",
    }))
    .sort((a, b) => b.views - a.views);

  // ── period label ──────────────────────────────────────────────────────────
  const periodLabel = days === 7 ? "7 дней" : days === 90 ? "90 дней" : "30 дней";

  return (
    <>
      <PageHeader
        title="Аналитика сайта"
        description={`Данные за последние ${periodLabel}. Просмотров: ${fmt(totalPageViews)}, уникальных посетителей: ${fmt(uniqueVisitors)}.`}
        actions={
          <FilterSelect
            param="days"
            allLabel="30 дней"
            options={[
              { value: "7", label: "7 дней" },
              { value: "90", label: "90 дней" },
            ]}
          />
        }
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Уник. посетители" value={fmt(uniqueVisitors)} />
        <KpiCard label="Просмотры страниц" value={fmt(totalPageViews)} />
        <KpiCard label="Заявки" value={fmt(leadsCount ?? 0)} />
        <KpiCard label="Конверсия в заказ" value={`${convRate}%`} sub={`${ordersCount ?? 0} заказов`} />
        <KpiCard label="Средняя глубина" value={String(avgDepth)} sub="стр./сессия" />
        <KpiCard label="Bounce rate" value={`${bounceRate.toFixed(1)}%`} sub={`из ${fmt(totalSessions)} сессий`} />
      </div>

      {/* Views by day */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Просмотры по дням</PanelTitle>
        </PanelHeader>
        <div className="p-4">
          {totalPageViews === 0 ? (
            <ChartEmpty />
          ) : (
            <TimeSeriesChart data={viewsByDay} valueFormatter={fmt} />
          )}
        </div>
      </Panel>

      {/* Funnel + Sources */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Конверсионная воронка */}
        <Panel>
          <PanelHeader>
            <PanelTitle>Конверсионная воронка</PanelTitle>
          </PanelHeader>
          <div className="px-5 pb-4 pt-2">
            {!hasFunnel ? (
              <ChartEmpty />
            ) : (
              <>
                <div className="mb-2 flex gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
                  <span className="flex-1">Шаг</span>
                  <span className="w-16 text-right">Событий</span>
                  <span className="w-14 text-right">От 1-го</span>
                  <span className="w-14 text-right">Отсев</span>
                </div>
                {funnelStepsData.map((step, i) => {
                  const prev = i > 0 ? funnelStepsData[i - 1].count : step.count;
                  const dropOff = prev > 0 && i > 0 ? `-${(((prev - step.count) / prev) * 100).toFixed(0)}%` : "—";
                  return (
                    <FunnelRow
                      key={step.key}
                      label={step.label}
                      count={step.count}
                      fromFirst={pct(step.count, funnelFirst)}
                      dropOff={dropOff}
                    />
                  );
                })}
              </>
            )}
          </div>
        </Panel>

        {/* Источники трафика */}
        <Panel>
          <PanelHeader>
            <PanelTitle>Источники трафика</PanelTitle>
          </PanelHeader>
          <div className="p-4">
            {sourceData.length === 0 ? (
              <ChartEmpty />
            ) : (
              <DonutChart data={sourceData} valueFormatter={fmt} />
            )}
          </div>
        </Panel>
      </div>

      {/* Top pages */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Топ-страниц</PanelTitle>
        </PanelHeader>
        {topPages.length === 0 ? (
          <div className="p-5">
            <ChartEmpty />
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Путь</TH>
              <TH className="w-28 text-right">Просмотры</TH>
              <TH className="w-32 text-right">Уник. посетители</TH>
            </THead>
            <TBody>
              {topPages.map((row) => (
                <TR key={row.path}>
                  <TD className="font-mono text-[13px]">{row.path}</TD>
                  <TD className="text-right font-medium">{fmt(row.views)}</TD>
                  <TD className="text-right text-ink-muted">{fmt(row.visitors)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      {/* Devices + Search */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Устройства */}
        <Panel>
          <PanelHeader>
            <PanelTitle>Устройства</PanelTitle>
          </PanelHeader>
          <div className="p-4">
            {deviceData.length === 0 ? (
              <ChartEmpty />
            ) : (
              <DonutChart data={deviceData} valueFormatter={fmt} />
            )}
          </div>
        </Panel>

        {/* Поисковые запросы */}
        <Panel>
          <PanelHeader>
            <PanelTitle>Поисковые запросы</PanelTitle>
          </PanelHeader>
          <div className="p-4 space-y-5">
            {topQueries.length === 0 && topNoResult.length === 0 ? (
              <ChartEmpty />
            ) : (
              <>
                {/* Топ-запросы */}
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">Топ-запросы</p>
                  {topQueries.length === 0 ? (
                    <p className="text-sm text-ink-subtle">Нет данных</p>
                  ) : (
                    <Table>
                      <THead>
                        <TH>Запрос</TH>
                        <TH className="w-20 text-right">Раз</TH>
                      </THead>
                      <TBody>
                        {topQueries.map((r, i) => (
                          <TR key={i}>
                            <TD>{r.query}</TD>
                            <TD className="text-right font-medium">{fmt(r.count)}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </div>

                {/* Запросы без результатов */}
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">Запросы без результатов</p>
                  {topNoResult.length === 0 ? (
                    <p className="text-sm text-ink-subtle">Таких запросов нет</p>
                  ) : (
                    <Table>
                      <THead>
                        <TH>Запрос</TH>
                        <TH className="w-20 text-right">Раз</TH>
                      </THead>
                      <TBody>
                        {topNoResult.map((r, i) => (
                          <TR key={i}>
                            <TD>{r.query}</TD>
                            <TD className="text-right font-medium text-sale">{fmt(r.count)}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* Hero CTR */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Hero CTR — слайды главной</PanelTitle>
        </PanelHeader>
        {heroRows.length === 0 ? (
          <div className="p-5">
            <ChartEmpty />
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Слайд</TH>
              <TH className="w-24 text-right">Показы</TH>
              <TH className="w-24 text-right">Клики</TH>
              <TH className="w-20 text-right">CTR</TH>
            </THead>
            <TBody>
              {heroRows.map((row) => (
                <TR key={row.id}>
                  <TD>{row.title}</TD>
                  <TD className="text-right">{fmt(row.views)}</TD>
                  <TD className="text-right">{fmt(row.clicks)}</TD>
                  <TD className="text-right font-medium">{row.ctr}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
