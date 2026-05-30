import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart, DonutChart, BarsChart, type SeriesPoint } from "@/components/admin/Charts";
import { PeriodPicker } from "@/components/admin/analytics/PeriodPicker";
import { AnalyticsTabs } from "@/components/admin/analytics/AnalyticsTabs";
import { KpiCard, KpiRow } from "@/components/admin/analytics/KpiCard";
import { getDateRange, getPreviousPeriod, parsePreset, rangeLabel, daysInRange, type Range } from "@/lib/analytics/dateRange";
import { formatNumber, formatPercent } from "@/lib/analytics/format";

export const metadata: Metadata = { title: "Аналитика сайта" };

const TABS = [
  { key: "overview", label: "Обзор" },
  { key: "audience", label: "Аудитория" },
  { key: "behavior", label: "Поведение" },
  { key: "sources", label: "Источники" },
  { key: "tech", label: "Технические" },
];

const DEVICE_LABELS: Record<string, string> = { desktop: "Десктоп", mobile: "Мобильный", tablet: "Планшет", "—": "Неизвестно" };

function fmt(n: number) { return n.toLocaleString("ru-RU"); }
function pctStr(a: number, b: number) { return b ? `${((a / b) * 100).toFixed(1)}%` : "0%"; }

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

function refHost(referrer: string | null): string {
  if (!referrer) return "—";
  try { return new URL(referrer).hostname.replace(/^www\./, ""); } catch { return "—"; }
}

type ViewRow = {
  path: string; referrer: string | null; utm: Record<string, string> | null;
  session_id: string | null; visitor_id: string | null; device_type: string | null;
  city: string | null; created_at: string;
};
type SessionRow = { id: string; is_bounce: boolean | null; pages_count: number | null };

async function loadSite(db: ReturnType<typeof createSupabaseAdminClient>, range: Range) {
  const from = range.from.toISOString();
  const to = range.to.toISOString();
  const [{ data: viewsRaw }, { data: sessionsRaw }, { count: leadsCount }, { count: ordersCount }] = await Promise.all([
    db.from("page_views").select("path,referrer,utm,session_id,visitor_id,device_type,city,created_at").gte("created_at", from).lte("created_at", to).limit(20000),
    db.from("sessions").select("id,is_bounce,pages_count").gte("created_at", from).lte("created_at", to).limit(20000),
    db.from("leads").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
    db.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", from).lte("created_at", to),
  ]);
  const views = (viewsRaw ?? []) as ViewRow[];
  const sessions = (sessionsRaw ?? []) as SessionRow[];

  const visitors = new Set(views.map((v) => v.visitor_id ?? v.session_id)).size;
  const pageviews = views.length;
  const sessionPages: Record<string, number> = {};
  for (const v of views) { const s = v.session_id ?? "—"; sessionPages[s] = (sessionPages[s] ?? 0) + 1; }
  const totalSessions = sessions.length || Object.keys(sessionPages).length;
  const bounceSessions = sessions.length
    ? sessions.filter((s) => s.is_bounce).length
    : Object.values(sessionPages).filter((c) => c === 1).length;
  const bounce = totalSessions ? (bounceSessions / totalSessions) * 100 : 0;
  const depth = totalSessions ? pageviews / totalSessions : 0;
  const conversion = visitors ? ((ordersCount ?? 0) / visitors) * 100 : 0;

  return {
    views, sessions, visitors, pageviews, totalSessions, bounce, depth, conversion,
    leads: leadsCount ?? 0, orders: ordersCount ?? 0,
  };
}

type SiteData = Awaited<ReturnType<typeof loadSite>>;

/* ── маленькие переиспользуемые виджеты ─────────────────────────────────────── */

function RankTable({ rows, head, render }: { rows: unknown[]; head: ReactNode; render: (r: never, i: number) => ReactNode }) {
  if (rows.length === 0) return <div className="p-5"><EmptyState title="Данных пока нет" hint="Копятся по мере трафика на сайте." /></div>;
  return <Table><THead>{head}</THead><TBody>{rows.map((r, i) => render(r as never, i))}</TBody></Table>;
}

function Donut({ data, title }: { data: SeriesPoint[]; title: string }) {
  return (
    <Panel>
      <PanelHeader><PanelTitle>{title}</PanelTitle></PanelHeader>
      <div className="p-4">{data.length === 0 ? <EmptyState title="Данных пока нет" /> : <DonutChart data={data} format="number" />}</div>
    </Panel>
  );
}

/* ── агрегаторы по views ────────────────────────────────────────────────────── */

function sourceBreakdown(views: ViewRow[]) {
  const map: Record<string, { views: number; visitors: Set<string> }> = {};
  for (const v of views) {
    const src = classifySource(v.referrer, v.utm);
    (map[src] ??= { views: 0, visitors: new Set() });
    map[src].views++;
    map[src].visitors.add(v.visitor_id ?? v.session_id ?? "");
  }
  return Object.entries(map).map(([label, d]) => ({ label, views: d.views, visitors: d.visitors.size })).sort((a, b) => b.views - a.views);
}

function deviceBreakdown(views: ViewRow[]) {
  const map: Record<string, number> = {};
  for (const v of views) { const d = v.device_type ?? "—"; map[d] = (map[d] ?? 0) + 1; }
  return Object.entries(map).map(([k, value]) => ({ label: DEVICE_LABELS[k] ?? k, value })).sort((a, b) => b.value - a.value);
}

function cityBreakdown(views: ViewRow[]) {
  const map: Record<string, Set<string>> = {};
  for (const v of views) {
    const c = (v.city && v.city.trim()) || "Не определён";
    (map[c] ??= new Set()).add(v.visitor_id ?? v.session_id ?? "");
  }
  return Object.entries(map).map(([label, set]) => ({ label, value: set.size })).sort((a, b) => b.value - a.value);
}

/* ── page ───────────────────────────────────────────────────────────────────── */

export default async function SiteAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin(["admin", "manager", "analytics"]);
  const params = await searchParams;
  const tab = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : "overview";
  const period = parsePreset(typeof params.period === "string" ? params.period : undefined);
  const compare = params.compare !== "false";
  const range = getDateRange(period);
  const prevRange = getPreviousPeriod(range);

  const db = createSupabaseAdminClient();
  const cur: SiteData = await loadSite(db, range);
  const prev: SiteData | null = tab === "overview" && compare ? await loadSite(db, prevRange) : null;

  const header = (
    <>
      <PageHeader
        title="Аналитика сайта"
        description={`${rangeLabel(range)}${tab === "overview" && compare ? ` · сравнение с ${rangeLabel(prevRange)}` : ""}`}
      />
      <div className="sticky top-14 z-20 -mx-4 mb-1 border-b border-border/60 bg-bg/85 px-4 py-2 backdrop-blur-sm lg:-mx-8 lg:px-8">
        <PeriodPicker period={period} compare={compare} />
      </div>
      <AnalyticsTabs tabs={TABS} active={tab} />
    </>
  );

  /* ── Обзор ── */
  if (tab === "overview") {
    const dayKeys = daysInRange(range);
    const viewsByDayMap: Record<string, number> = {};
    const visByDay: Record<string, Set<string>> = {};
    for (const v of cur.views) {
      const d = v.created_at.slice(0, 10);
      viewsByDayMap[d] = (viewsByDayMap[d] ?? 0) + 1;
      (visByDay[d] ??= new Set()).add(v.visitor_id ?? v.session_id ?? "");
    }
    const pvSpark = dayKeys.map((d) => viewsByDayMap[d] ?? 0);
    const visSpark = dayKeys.map((d) => visByDay[d]?.size ?? 0);
    const viewsSeries: SeriesPoint[] = dayKeys.map((d) => ({ label: d.slice(5).replace("-", "."), value: viewsByDayMap[d] ?? 0 }));
    const sources = sourceBreakdown(cur.views);
    const devices = deviceBreakdown(cur.views);
    const pathViews: Record<string, number> = {};
    const pathVisitors: Record<string, Set<string>> = {};
    for (const v of cur.views) { pathViews[v.path] = (pathViews[v.path] ?? 0) + 1; (pathVisitors[v.path] ??= new Set()).add(v.visitor_id ?? v.session_id ?? ""); }
    const topPages = Object.entries(pathViews).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, v]) => ({ path, views: v, visitors: pathVisitors[path]?.size ?? 0 }));
    const vs = (val: string) => (compare && prev ? `vs ${val} в прошлом периоде` : undefined);

    return (
      <>
        {header}
        <div className="space-y-6">
          <KpiRow>
            <KpiCard metric="visitors" value={formatNumber(cur.visitors)} current={cur.visitors} previous={prev?.visitors} spark={visSpark} previousLabel={prev ? vs(formatNumber(prev.visitors)) : undefined} />
            <KpiCard metric="pageviews" value={formatNumber(cur.pageviews)} current={cur.pageviews} previous={prev?.pageviews} spark={pvSpark} previousLabel={prev ? vs(formatNumber(prev.pageviews)) : undefined} />
            <KpiCard metric="leads" value={formatNumber(cur.leads)} current={cur.leads} previous={prev?.leads} previousLabel={prev ? vs(formatNumber(prev.leads)) : undefined} />
            <KpiCard metric="conversion" value={formatPercent(cur.conversion, 2)} current={cur.conversion} previous={prev?.conversion} previousLabel={`${cur.orders} заказов`} />
            <KpiCard metric="depth" value={cur.depth.toFixed(1).replace(".", ",")} current={cur.depth} previous={prev?.depth} previousLabel={`${fmt(cur.totalSessions)} сессий`} />
            <KpiCard metric="bounce" value={formatPercent(cur.bounce)} current={cur.bounce} previous={prev?.bounce} previousLabel={prev ? vs(formatPercent(prev.bounce)) : undefined} />
          </KpiRow>

          <Panel>
            <PanelHeader><PanelTitle>Просмотры по дням</PanelTitle></PanelHeader>
            <div className="p-4">{cur.pageviews === 0 ? <EmptyState title="Данных пока нет" hint="Копятся по мере трафика на сайте." /> : <TimeSeriesChart data={viewsSeries} format="number" />}</div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Donut data={sources.map((s) => ({ label: s.label, value: s.views }))} title="Источники трафика" />
            <Donut data={devices} title="Устройства" />
          </div>

          <Panel>
            <PanelHeader><PanelTitle>Топ-страниц</PanelTitle></PanelHeader>
            <RankTable
              rows={topPages}
              head={<><TH>Путь</TH><TH className="w-28 text-right">Просмотры</TH><TH className="w-36 text-right">Уник. посетители</TH></>}
              render={(r: { path: string; views: number; visitors: number }) => (
                <TR key={r.path}><TD className="font-mono text-[13px]">{r.path}</TD><TD className="text-right font-medium">{fmt(r.views)}</TD><TD className="text-right text-ink-muted">{fmt(r.visitors)}</TD></TR>
              )}
            />
          </Panel>
        </div>
      </>
    );
  }

  /* ── Аудитория ── */
  if (tab === "audience") {
    // новые vs вернувшиеся: посетитель «вернувшийся», если заходил в ≥2 разных дня периода
    const visitorDays: Record<string, Set<string>> = {};
    for (const v of cur.views) {
      const id = v.visitor_id ?? v.session_id ?? "";
      (visitorDays[id] ??= new Set()).add(v.created_at.slice(0, 10));
    }
    const ids = Object.keys(visitorDays);
    const returning = ids.filter((id) => visitorDays[id].size >= 2).length;
    const fresh = ids.length - returning;
    const cities = cityBreakdown(cur.views);

    return (
      <>
        {header}
        <div className="space-y-6">
          <KpiRow>
            <KpiCard label="Уник. посетители" value={formatNumber(cur.visitors)} current={cur.visitors} previousLabel="за период" />
            <KpiCard label="Новые" value={formatNumber(fresh)} current={fresh} previousLabel={ids.length ? `${pctStr(fresh, ids.length)} от всех` : undefined} />
            <KpiCard label="Вернувшиеся" value={formatNumber(returning)} current={returning} previousLabel={ids.length ? `${pctStr(returning, ids.length)} · заходили ≥2 дней` : undefined} />
            <KpiCard label="Сессии" value={formatNumber(cur.totalSessions)} current={cur.totalSessions} previousLabel={`${cur.depth.toFixed(1).replace(".", ",")} стр./сессия`} />
          </KpiRow>
          <div className="grid gap-5 lg:grid-cols-2">
            <Donut data={[{ label: "Новые", value: fresh }, { label: "Вернувшиеся", value: returning }]} title="Новые и вернувшиеся" />
            <Donut data={cities.map((c) => ({ label: c.label, value: c.value }))} title="География (по посетителям)" />
          </div>
          <Panel>
            <PanelHeader><PanelTitle>Города</PanelTitle></PanelHeader>
            <RankTable
              rows={cities.slice(0, 15)}
              head={<><TH>Город</TH><TH className="w-36 text-right">Посетители</TH></>}
              render={(r: { label: string; value: number }) => (<TR key={r.label}><TD>{r.label}</TD><TD className="text-right font-medium">{fmt(r.value)}</TD></TR>)}
            />
          </Panel>
        </div>
      </>
    );
  }

  /* ── Поведение: воронка + поиск + hero CTR ── */
  if (tab === "behavior") {
    const from = range.from.toISOString();
    const to = range.to.toISOString();
    const [{ data: funnelRaw }, { data: searchRaw }, { data: heroEventsRaw }, { data: heroSlidesRaw }] = await Promise.all([
      db.from("funnel_events").select("event_type,session_id,created_at").gte("created_at", from).lte("created_at", to).limit(50000),
      db.from("search_queries").select("query,normalized_query,results_count,created_at").gte("created_at", from).lte("created_at", to).limit(10000),
      db.from("hero_slide_events").select("slide_id,event_type,created_at").gte("created_at", from).lte("created_at", to).limit(50000),
      db.from("hero_slides").select("id,title"),
    ]);
    const funnelEvents = (funnelRaw ?? []) as { event_type: string }[];
    const searchRows = (searchRaw ?? []) as { query: string; normalized_query: string | null; results_count: number }[];
    const heroEvents = (heroEventsRaw ?? []) as { slide_id: string | null; event_type: string }[];
    const heroSlides = (heroSlidesRaw ?? []) as { id: string; title: string | null }[];

    const FUNNEL = [
      { key: "view_page", label: "Просмотр страницы" },
      { key: "view_product", label: "Просмотр товара" },
      { key: "add_to_cart", label: "Добавление в корзину" },
      { key: "begin_checkout", label: "Начало оформления" },
      { key: "submit_order", label: "Отправка заказа" },
      { key: "pay_order", label: "Оплата заказа" },
    ];
    const fc: Record<string, number> = {};
    for (const e of funnelEvents) fc[e.event_type] = (fc[e.event_type] ?? 0) + 1;
    const steps = FUNNEL.map((s) => ({ ...s, count: fc[s.key] ?? 0 }));
    const first = steps[0]?.count ?? 0;
    const hasFunnel = steps.some((s) => s.count > 0);

    const qc: Record<string, number> = {};
    const noRes: Record<string, number> = {};
    for (const s of searchRows) {
      const k = s.normalized_query ?? s.query;
      qc[k] = (qc[k] ?? 0) + 1;
      if (s.results_count === 0) noRes[k] = (noRes[k] ?? 0) + 1;
    }
    const topQ = Object.entries(qc).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([query, count]) => ({ query, count }));
    const topNoRes = Object.entries(noRes).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([query, count]) => ({ query, count }));

    const heroMap = Object.fromEntries(heroSlides.map((s) => [s.id, s.title ?? s.id]));
    const hv: Record<string, number> = {}; const hcl: Record<string, number> = {};
    for (const e of heroEvents) { const id = e.slide_id ?? "unknown"; if (e.event_type === "view") hv[id] = (hv[id] ?? 0) + 1; else if (e.event_type === "click") hcl[id] = (hcl[id] ?? 0) + 1; }
    const heroRows = Object.keys({ ...hv, ...hcl }).map((id) => ({
      id, title: heroMap[id] ?? id, views: hv[id] ?? 0, clicks: hcl[id] ?? 0,
      ctr: hv[id] ? `${(((hcl[id] ?? 0) / hv[id]) * 100).toFixed(1)}%` : "—",
    })).sort((a, b) => b.views - a.views);

    return (
      <>
        {header}
        <div className="space-y-6">
          <Panel>
            <PanelHeader><PanelTitle>Конверсионная воронка</PanelTitle></PanelHeader>
            <div className="px-5 pb-4 pt-2">
              {!hasFunnel ? <EmptyState title="Данных пока нет" hint="События воронки копятся по мере трафика." /> : (
                <>
                  <div className="mb-2 flex gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
                    <span className="flex-1">Шаг</span><span className="w-16 text-right">Событий</span><span className="w-14 text-right">От 1-го</span><span className="w-14 text-right">Отсев</span>
                  </div>
                  {steps.map((s, i) => {
                    const prevCount = i > 0 ? steps[i - 1].count : s.count;
                    const drop = prevCount > 0 && i > 0 ? `-${(((prevCount - s.count) / prevCount) * 100).toFixed(0)}%` : "—";
                    return (
                      <div key={s.key} className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-0">
                        <p className="min-w-0 flex-1 truncate text-[14px] text-ink">{s.label}</p>
                        <span className="w-16 text-right text-[14px] font-medium text-ink">{fmt(s.count)}</span>
                        <span className="w-14 text-right text-[13px] text-ink-muted">{pctStr(s.count, first)}</span>
                        <span className="w-14 text-right text-[12px] text-ink-subtle">{drop}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader><PanelTitle>Топ поисковых запросов</PanelTitle></PanelHeader>
              <RankTable rows={topQ} head={<><TH>Запрос</TH><TH className="w-20 text-right">Раз</TH></>} render={(r: { query: string; count: number }, i) => (<TR key={i}><TD>{r.query}</TD><TD className="text-right font-medium">{fmt(r.count)}</TD></TR>)} />
            </Panel>
            <Panel>
              <PanelHeader><PanelTitle>Запросы без результатов</PanelTitle></PanelHeader>
              <RankTable rows={topNoRes} head={<><TH>Запрос</TH><TH className="w-20 text-right">Раз</TH></>} render={(r: { query: string; count: number }, i) => (<TR key={i}><TD>{r.query}</TD><TD className="text-right font-medium text-sale">{fmt(r.count)}</TD></TR>)} />
            </Panel>
          </div>

          <Panel>
            <PanelHeader><PanelTitle>Hero CTR — слайды главной</PanelTitle></PanelHeader>
            <RankTable
              rows={heroRows}
              head={<><TH>Слайд</TH><TH className="w-24 text-right">Показы</TH><TH className="w-24 text-right">Клики</TH><TH className="w-20 text-right">CTR</TH></>}
              render={(r: { id: string; title: string; views: number; clicks: number; ctr: string }) => (
                <TR key={r.id}><TD>{r.title}</TD><TD className="text-right">{fmt(r.views)}</TD><TD className="text-right">{fmt(r.clicks)}</TD><TD className="text-right font-medium">{r.ctr}</TD></TR>
              )}
            />
          </Panel>
        </div>
      </>
    );
  }

  /* ── Источники ── */
  if (tab === "sources") {
    const sources = sourceBreakdown(cur.views);
    const refMap: Record<string, number> = {};
    for (const v of cur.views) { const h = refHost(v.referrer); if (h !== "—") refMap[h] = (refMap[h] ?? 0) + 1; }
    const refRows = Object.entries(refMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([host, views]) => ({ host, views }));

    return (
      <>
        {header}
        <div className="space-y-6">
          <Donut data={sources.map((s) => ({ label: s.label, value: s.views }))} title="Каналы трафика" />
          <Panel>
            <PanelHeader><PanelTitle>Каналы — детально</PanelTitle></PanelHeader>
            <RankTable
              rows={sources}
              head={<><TH>Канал</TH><TH className="w-28 text-right">Просмотры</TH><TH className="w-32 text-right">Посетители</TH><TH className="w-24 text-right">Доля</TH></>}
              render={(r: { label: string; views: number; visitors: number }) => (
                <TR key={r.label}><TD>{r.label}</TD><TD className="text-right font-medium">{fmt(r.views)}</TD><TD className="text-right text-ink-muted">{fmt(r.visitors)}</TD><TD className="text-right text-ink-subtle">{pctStr(r.views, cur.pageviews)}</TD></TR>
              )}
            />
          </Panel>
          <Panel>
            <PanelHeader><PanelTitle>Источники-рефереры</PanelTitle></PanelHeader>
            <RankTable rows={refRows} head={<><TH>Домен</TH><TH className="w-28 text-right">Переходы</TH></>} render={(r: { host: string; views: number }) => (<TR key={r.host}><TD className="font-mono text-[13px]">{r.host}</TD><TD className="text-right font-medium">{fmt(r.views)}</TD></TR>)} />
        </Panel>
        </div>
      </>
    );
  }

  /* ── Технические ── */
  const devices = deviceBreakdown(cur.views);
  const devTotal = devices.reduce((s, d) => s + d.value, 0);
  return (
    <>
      {header}
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <Donut data={devices} title="Устройства" />
          <Panel>
            <PanelHeader><PanelTitle>Устройства — детально</PanelTitle></PanelHeader>
            <RankTable
              rows={devices}
              head={<><TH>Тип</TH><TH className="w-28 text-right">Просмотры</TH><TH className="w-24 text-right">Доля</TH></>}
              render={(r: { label: string; value: number }) => (<TR key={r.label}><TD>{r.label}</TD><TD className="text-right font-medium">{fmt(r.value)}</TD><TD className="text-right text-ink-subtle">{pctStr(r.value, devTotal)}</TD></TR>)}
            />
          </Panel>
        </div>
        {devices.length > 0 ? (
          <Panel>
            <PanelHeader><PanelTitle>Распределение устройств</PanelTitle></PanelHeader>
            <div className="p-4"><BarsChart data={devices.map((d) => ({ label: d.label, value: d.value }))} horizontal height={Math.max(160, devices.length * 38)} format="number" /></div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
