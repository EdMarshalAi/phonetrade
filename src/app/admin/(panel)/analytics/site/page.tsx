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
function num(v: unknown) { return Number(v ?? 0); }

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

/* ── загрузка KPI (агрегация в БД, не вытягиваем сырые строки) ─────────────────── */

async function loadSummary(db: ReturnType<typeof createSupabaseAdminClient>, range: Range) {
  const from = range.from.toISOString();
  const to = range.to.toISOString();
  const [{ data: sumRows }, { count: leadsCount }, { count: ordersCount }] = await Promise.all([
    db.rpc("analytics_summary", { p_from: from, p_to: to }),
    db.from("leads").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
    db.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", from).lte("created_at", to),
  ]);
  const s = (sumRows?.[0] ?? {}) as { visitors?: unknown; pageviews?: unknown; sessions?: unknown; bounce_sessions?: unknown };
  const visitors = num(s.visitors);
  const pageviews = num(s.pageviews);
  const totalSessions = num(s.sessions);
  const bounceSessions = num(s.bounce_sessions);
  const bounce = totalSessions ? (bounceSessions / totalSessions) * 100 : 0;
  const depth = totalSessions ? pageviews / totalSessions : 0;
  const conversion = visitors ? ((ordersCount ?? 0) / visitors) * 100 : 0;
  return { visitors, pageviews, totalSessions, bounce, depth, conversion, leads: leadsCount ?? 0, orders: ordersCount ?? 0 };
}

type SiteData = Awaited<ReturnType<typeof loadSummary>>;

/* ── helpers над агрегатами рефереров ────────────────────────────────────────── */

type RefGroup = { referrer: string | null; utm: Record<string, string> | null; views: number; visitors: number };

function classifySources(groups: RefGroup[]) {
  const map: Record<string, { views: number; visitors: number }> = {};
  for (const g of groups) {
    const src = classifySource(g.referrer, g.utm);
    (map[src] ??= { views: 0, visitors: 0 });
    map[src].views += g.views;
    map[src].visitors += g.visitors;
  }
  return Object.entries(map).map(([label, d]) => ({ label, views: d.views, visitors: d.visitors })).sort((a, b) => b.views - a.views);
}

function refHosts(groups: RefGroup[]) {
  const map: Record<string, number> = {};
  for (const g of groups) { const h = refHost(g.referrer); if (h !== "—") map[h] = (map[h] ?? 0) + g.views; }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([host, views]) => ({ host, views }));
}

async function loadReferrers(db: ReturnType<typeof createSupabaseAdminClient>, range: Range): Promise<RefGroup[]> {
  const { data } = await db.rpc("analytics_by_referrer", { p_from: range.from.toISOString(), p_to: range.to.toISOString() });
  return ((data ?? []) as { referrer: string | null; utm: Record<string, string> | null; views: unknown; visitors: unknown }[])
    .map((r) => ({ referrer: r.referrer, utm: r.utm, views: num(r.views), visitors: num(r.visitors) }));
}

async function loadDevices(db: ReturnType<typeof createSupabaseAdminClient>, range: Range) {
  const { data } = await db.rpc("analytics_by_device", { p_from: range.from.toISOString(), p_to: range.to.toISOString() });
  return ((data ?? []) as { device_type: string; views: unknown }[])
    .map((d) => ({ label: DEVICE_LABELS[d.device_type] ?? d.device_type, value: num(d.views) }))
    .sort((a, b) => b.value - a.value);
}

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
  const from = range.from.toISOString();
  const to = range.to.toISOString();

  const db = createSupabaseAdminClient();
  const cur: SiteData = await loadSummary(db, range);
  const prev: SiteData | null = tab === "overview" && compare ? await loadSummary(db, prevRange) : null;

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
    const [{ data: byDayRaw }, refGroups, devices, { data: topPagesRaw }] = await Promise.all([
      db.rpc("analytics_views_by_day", { p_from: from, p_to: to }),
      loadReferrers(db, range),
      loadDevices(db, range),
      db.rpc("analytics_top_pages", { p_from: from, p_to: to }),
    ]);
    const byDay = ((byDayRaw ?? []) as { d: string; views: unknown; visitors: unknown }[]).map((r) => ({ d: r.d, views: num(r.views), visitors: num(r.visitors) }));
    const viewsByDayMap: Record<string, number> = Object.fromEntries(byDay.map((r) => [r.d, r.views]));
    const visByDayMap: Record<string, number> = Object.fromEntries(byDay.map((r) => [r.d, r.visitors]));
    const pvSpark = dayKeys.map((d) => viewsByDayMap[d] ?? 0);
    const visSpark = dayKeys.map((d) => visByDayMap[d] ?? 0);
    const viewsSeries: SeriesPoint[] = dayKeys.map((d) => ({ label: d.slice(5).replace("-", "."), value: viewsByDayMap[d] ?? 0 }));
    const sources = classifySources(refGroups);
    const topPages = ((topPagesRaw ?? []) as { path: string; views: unknown; visitors: unknown }[]).slice(0, 10).map((r) => ({ path: r.path, views: num(r.views), visitors: num(r.visitors) }));
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
    const [{ data: nrRaw }, { data: cityRaw }] = await Promise.all([
      db.rpc("analytics_new_returning", { p_from: from, p_to: to }),
      db.rpc("analytics_by_city", { p_from: from, p_to: to }),
    ]);
    const total = num((nrRaw?.[0] as { total?: unknown })?.total);
    const returning = num((nrRaw?.[0] as { returning_cnt?: unknown })?.returning_cnt);
    const fresh = total - returning;
    const cities = ((cityRaw ?? []) as { city: string; visitors: unknown }[]).map((c) => ({ label: c.city, value: num(c.visitors) }));

    return (
      <>
        {header}
        <div className="space-y-6">
          <KpiRow>
            <KpiCard label="Уник. посетители" value={formatNumber(cur.visitors)} current={cur.visitors} previousLabel="за период" />
            <KpiCard label="Новые" value={formatNumber(fresh)} current={fresh} previousLabel={total ? `${pctStr(fresh, total)} от всех` : undefined} />
            <KpiCard label="Вернувшиеся" value={formatNumber(returning)} current={returning} previousLabel={total ? `${pctStr(returning, total)} · заходили ≥2 дней` : undefined} />
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
    const [{ data: funnelRaw }, { data: searchRaw }, { data: heroRaw }, { data: heroSlidesRaw }] = await Promise.all([
      db.rpc("analytics_funnel", { p_from: from, p_to: to }),
      db.rpc("analytics_search", { p_from: from, p_to: to }),
      db.rpc("analytics_hero", { p_from: from, p_to: to }),
      db.from("hero_slides").select("id,title"),
    ]);
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
    for (const e of (funnelRaw ?? []) as { event_type: string; cnt: unknown }[]) fc[e.event_type] = num(e.cnt);
    const steps = FUNNEL.map((s) => ({ ...s, count: fc[s.key] ?? 0 }));
    const first = steps[0]?.count ?? 0;
    const hasFunnel = steps.some((s) => s.count > 0);

    const searchRows = ((searchRaw ?? []) as { q: string; cnt: unknown; nores: unknown }[]).map((r) => ({ query: r.q, count: num(r.cnt), nores: num(r.nores) }));
    const topQ = searchRows.slice(0, 10);
    const topNoRes = searchRows.filter((r) => r.nores > 0).sort((a, b) => b.nores - a.nores).slice(0, 10).map((r) => ({ query: r.query, count: r.nores }));

    const heroMap = Object.fromEntries(heroSlides.map((s) => [s.id, s.title ?? s.id]));
    const hv: Record<string, number> = {}; const hcl: Record<string, number> = {};
    for (const e of (heroRaw ?? []) as { slide_id: string; event_type: string; cnt: unknown }[]) {
      const id = e.slide_id ?? "unknown";
      if (e.event_type === "view") hv[id] = num(e.cnt); else if (e.event_type === "click") hcl[id] = num(e.cnt);
    }
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
    const refGroups = await loadReferrers(db, range);
    const sources = classifySources(refGroups);
    const refRows = refHosts(refGroups);

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
  const devices = await loadDevices(db, range);
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
