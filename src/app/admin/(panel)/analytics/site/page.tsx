import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart, DonutChart, type SeriesPoint } from "@/components/admin/Charts";
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
  const [cur, prev] = await Promise.all([
    loadSite(db, range),
    compare ? loadSite(db, prevRange) : Promise.resolve(null),
  ]);

  // дневные ряды (текущий период) для sparkline и графика
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

  // источники / устройства / топ-страниц (текущий период)
  const sourceCount: Record<string, number> = {};
  const deviceCount: Record<string, number> = {};
  const pathViews: Record<string, number> = {};
  const pathVisitors: Record<string, Set<string>> = {};
  for (const v of cur.views) {
    const src = classifySource(v.referrer, v.utm);
    sourceCount[src] = (sourceCount[src] ?? 0) + 1;
    const dev = v.device_type ?? "—";
    deviceCount[dev] = (deviceCount[dev] ?? 0) + 1;
    pathViews[v.path] = (pathViews[v.path] ?? 0) + 1;
    (pathVisitors[v.path] ??= new Set()).add(v.visitor_id ?? v.session_id ?? "");
  }
  const sourceData: SeriesPoint[] = Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  const deviceData: SeriesPoint[] = Object.entries(deviceCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: DEVICE_LABELS[k] ?? k, value: v }));
  const topPages = Object.entries(pathViews).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([path, v]) => ({ path, views: v, visitors: pathVisitors[path]?.size ?? 0 }));

  const vs = (val: string) => (compare && prev ? `vs ${val} в прошлом периоде` : undefined);

  return (
    <>
      <PageHeader
        title="Аналитика сайта"
        description={`${rangeLabel(range)}${compare ? ` · сравнение с ${rangeLabel(prevRange)}` : ""}`}
      />
      <div className="sticky top-14 z-20 -mx-4 mb-1 border-b border-border/60 bg-bg/85 px-4 py-2 backdrop-blur-sm lg:-mx-8 lg:px-8">
        <PeriodPicker period={period} compare={compare} />
      </div>
      <AnalyticsTabs tabs={TABS} active={tab} />

      {tab !== "overview" ? (
        <EmptyState title="Раздел готовится" hint="Этот таб аналитики появится в ближайшем обновлении. Сейчас доступен «Обзор» с ключевыми показателями и сравнением периодов." />
      ) : (
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
            <div className="p-4">
              {cur.pageviews === 0 ? <EmptyState title="Данных пока нет" hint="Копятся по мере трафика на сайте." /> : <TimeSeriesChart data={viewsSeries} format="number" />}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader><PanelTitle>Источники трафика</PanelTitle></PanelHeader>
              <div className="p-4">{sourceData.length === 0 ? <EmptyState title="Данных пока нет" /> : <DonutChart data={sourceData} format="number" />}</div>
            </Panel>
            <Panel>
              <PanelHeader><PanelTitle>Устройства</PanelTitle></PanelHeader>
              <div className="p-4">{deviceData.length === 0 ? <EmptyState title="Данных пока нет" /> : <DonutChart data={deviceData} format="number" />}</div>
            </Panel>
          </div>

          <Panel>
            <PanelHeader><PanelTitle>Топ-страниц</PanelTitle></PanelHeader>
            {topPages.length === 0 ? (
              <div className="p-5"><EmptyState title="Данных пока нет" hint="Копятся по мере трафика на сайте." /></div>
            ) : (
              <Table>
                <THead><TH>Путь</TH><TH className="w-28 text-right">Просмотры</TH><TH className="w-36 text-right">Уник. посетители</TH></THead>
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
        </div>
      )}
    </>
  );
}
