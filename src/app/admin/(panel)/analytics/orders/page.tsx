import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart, DonutChart, BarsChart, type SeriesPoint } from "@/components/admin/Charts";
import { PAYMENT_LABEL, DELIVERY_LABEL, ORDER_STATUS } from "@/app/admin/(panel)/orders/labels";
import { PeriodPicker } from "@/components/admin/analytics/PeriodPicker";
import { AnalyticsTabs } from "@/components/admin/analytics/AnalyticsTabs";
import { KpiCard, KpiRow } from "@/components/admin/analytics/KpiCard";
import { getDateRange, getPreviousPeriod, parsePreset, rangeLabel, daysInRange, type Range } from "@/lib/analytics/dateRange";
import { formatPrice, formatNumber, formatPercent } from "@/lib/analytics/format";

export const metadata: Metadata = { title: "Аналитика заказов" };

const TABS = [
  { key: "overview", label: "Обзор" },
  { key: "sales", label: "Продажи" },
  { key: "products", label: "Товары" },
  { key: "customers", label: "Клиенты" },
  { key: "finance", label: "Финансы" },
  { key: "trade-in", label: "Trade-in" },
];

const CATEGORY_LABEL: Record<string, string> = {
  iphone: "iPhone", ipad: "iPad", mac: "Mac", watch: "Apple Watch",
  airpods: "AirPods", accessories: "Аксессуары", "trade-in": "Trade-in", used: "Б/у техника",
};
const CASH_METHODS = new Set(["sbp", "cash"]);

function pct(n: number, total: number): string { return total === 0 ? "0%" : Math.round((n / total) * 100) + "%"; }
function div(a: number, b: number) { return b ? a / b : 0; }

interface OrderRow {
  id: string; total: number; subtotal: number | null; discount_cash: number | null; discount_promo: number | null;
  status: string; payment_method: string | null; delivery_method: string | null;
  promo_code: string | null; customer_id: string | null; created_at: string;
}
interface ItemRow { order_id: string; product_id: string | null; title: string | null; qty: number; total: number }
interface ProductRow { id: string; category_slug: string | null }
interface CustomerRow { id: string; name: string | null; phone: string | null; total_orders: number; total_spent: number; segment: string; last_order_at: string | null; first_order_at: string | null }

async function loadRange(db: ReturnType<typeof createSupabaseAdminClient>, range: Range, withItems: boolean) {
  const { data } = await db
    .from("orders")
    .select("id,total,subtotal,discount_cash,discount_promo,status,payment_method,delivery_method,promo_code,customer_id,created_at")
    .is("deleted_at", null)
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);
  const orders = (data ?? []) as OrderRow[];
  let items: ItemRow[] = [];
  if (withItems && orders.length) {
    const ids = orders.map((o) => o.id);
    const CHUNK = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
    const res = await Promise.all(chunks.map((c) => db.from("order_items").select("order_id,product_id,title,qty,total").in("order_id", c).limit(10000)));
    items = res.flatMap((r) => (r.data ?? []) as ItemRow[]);
  }
  return { orders, items };
}

function metricsOf(orders: OrderRow[], items: ItemRow[]) {
  const ok = orders.filter((o) => o.status !== "cancelled");
  const okIds = new Set(ok.map((o) => o.id));
  const revenue = ok.reduce((s, o) => s + (o.total ?? 0), 0);
  const units = items.filter((it) => okIds.has(it.order_id)).reduce((s, it) => s + (it.qty ?? 0), 0);
  const cancels = orders.length - ok.length;
  const cash = ok.filter((o) => CASH_METHODS.has(o.payment_method ?? "")).length;
  return { revenue, orders: orders.length, aov: div(revenue, ok.length), units, cancels, cashShare: ok.length ? (cash / ok.length) * 100 : 0, okOrders: ok, okIds };
}

function Donut({ data, title, format = "number" }: { data: SeriesPoint[]; title: string; format?: "number" | "ruble" }) {
  return (
    <Panel>
      <PanelHeader><PanelTitle>{title}</PanelTitle></PanelHeader>
      <div className="p-4">{data.length === 0 ? <EmptyState title="Нет данных" /> : <DonutChart data={data} format={format} />}</div>
    </Panel>
  );
}

function RankTable({ rows, head, render, empty = "Нет данных" }: { rows: unknown[]; head: ReactNode; render: (r: never, i: number) => ReactNode; empty?: string }) {
  if (rows.length === 0) return <div className="p-5"><EmptyState title={empty} hint="Появится после первых продаж." /></div>;
  return <Table><THead>{head}</THead><TBody>{rows.map((r, i) => render(r as never, i))}</TBody></Table>;
}

const CLASS_TONE: Record<string, string> = {
  A: "bg-ink text-white", B: "bg-ink/15 text-ink", C: "bg-surface text-ink-muted",
  X: "bg-ink text-white", Y: "bg-ink/15 text-ink", Z: "bg-surface text-ink-muted",
};
function Tag({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex min-w-6 items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone ?? "bg-surface text-ink-muted"}`}>{children}</span>;
}

export default async function OrdersAnalyticsPage({
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
  const [cur, prev, { data: productsRaw }] = await Promise.all([
    loadRange(db, range, true),
    tab === "overview" && compare ? loadRange(db, prevRange, true) : Promise.resolve(null),
    db.from("products").select("id,category_slug").limit(5000),
  ]);
  const products = (productsRaw ?? []) as ProductRow[];
  const productMap = new Map(products.map((p) => [p.id, p]));
  const m = metricsOf(cur.orders, cur.items);
  const pm = prev ? metricsOf(prev.orders, prev.items) : null;

  const dayKeys = daysInRange(range);
  const header = (
    <>
      <PageHeader title="Аналитика заказов" description={`${rangeLabel(range)}${tab === "overview" && compare ? ` · сравнение с ${rangeLabel(prevRange)}` : ""}`} />
      <div className="sticky top-14 z-20 -mx-4 mb-1 border-b border-border/60 bg-bg/85 px-4 py-2 backdrop-blur-sm lg:-mx-8 lg:px-8">
        <PeriodPicker period={period} compare={compare} />
      </div>
      <AnalyticsTabs tabs={TABS} active={tab} />
    </>
  );

  const noOrders = cur.orders.length === 0;

  /* ── общие ряды ── */
  const orderDate = new Map(cur.orders.map((o) => [o.id, o.created_at.slice(0, 10)]));
  const revByDay: Record<string, number> = {};
  const ordByDay: Record<string, number> = {};
  for (const o of m.okOrders) { const d = o.created_at.slice(0, 10); revByDay[d] = (revByDay[d] ?? 0) + (o.total ?? 0); }
  for (const o of cur.orders) { const d = o.created_at.slice(0, 10); ordByDay[d] = (ordByDay[d] ?? 0) + 1; }
  const revenueSeries: SeriesPoint[] = dayKeys.map((d) => ({ label: d.slice(5).replace("-", "."), value: revByDay[d] ?? 0 }));

  // продуктовая статистика (ok-заказы) + распределение по дням для XYZ
  const prodStats: Record<string, { id: string; title: string; qty: number; revenue: number; byDay: Record<string, number> }> = {};
  const catRev: Record<string, number> = {};
  for (const it of cur.items) {
    if (!m.okIds.has(it.order_id)) continue;
    const key = it.product_id ?? it.title ?? "u";
    if (!prodStats[key]) prodStats[key] = { id: key, title: it.title ?? "—", qty: 0, revenue: 0, byDay: {} };
    prodStats[key].qty += it.qty ?? 0;
    prodStats[key].revenue += it.total ?? 0;
    const d = orderDate.get(it.order_id);
    if (d) prodStats[key].byDay[d] = (prodStats[key].byDay[d] ?? 0) + (it.qty ?? 0);
    const slug = (it.product_id && productMap.get(it.product_id)?.category_slug) || "other";
    const cl = CATEGORY_LABEL[slug] ?? slug;
    catRev[cl] = (catRev[cl] ?? 0) + (it.total ?? 0);
  }

  /* ════════════ ОБЗОР ════════════ */
  if (tab === "overview") {
    const revSpark = dayKeys.map((d) => revByDay[d] ?? 0);
    const ordSpark = dayKeys.map((d) => ordByDay[d] ?? 0);
    const categoryData: SeriesPoint[] = Object.entries(catRev).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
    const top = Object.values(prodStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const topTotal = top.reduce((s, p) => s + p.revenue, 0);
    const payCounts: Record<string, number> = {};
    for (const o of m.okOrders) { const k = o.payment_method ?? "—"; payCounts[k] = (payCounts[k] ?? 0) + 1; }
    const paymentData: SeriesPoint[] = Object.entries(payCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: PAYMENT_LABEL[k] ?? k, value: v }));
    const statusCounts: Record<string, number> = {};
    for (const o of cur.orders) { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1; }
    const order = ["placed", "new", "confirmed", "packing", "ready", "shipped", "delivered", "cancelled"];
    const statusData: SeriesPoint[] = order.filter((s) => statusCounts[s]).map((s) => ({ label: ORDER_STATUS[s] ?? s, value: statusCounts[s] }));
    const vs = (val: string) => (compare && pm ? `vs ${val} в прошлом периоде` : undefined);

    return (
      <>
        {header}
        <div className="space-y-6">
          <KpiRow>
            <KpiCard metric="revenue" value={formatPrice(m.revenue)} current={m.revenue} previous={pm?.revenue} spark={revSpark} previousLabel={pm ? vs(formatPrice(pm.revenue)) : undefined} />
            <KpiCard metric="orders" value={formatNumber(m.orders)} current={m.orders} previous={pm?.orders} spark={ordSpark} previousLabel={pm ? vs(formatNumber(pm.orders)) : undefined} />
            <KpiCard metric="aov" value={formatPrice(m.aov)} current={m.aov} previous={pm?.aov} previousLabel={pm ? vs(formatPrice(pm.aov)) : undefined} />
            <KpiCard metric="units" value={formatNumber(m.units)} current={m.units} previous={pm?.units} previousLabel={pm ? vs(formatNumber(pm.units)) : undefined} />
            <KpiCard metric="cancels" value={formatNumber(m.cancels)} current={m.cancels} previous={pm?.cancels} previousLabel={m.orders ? pct(m.cancels, m.orders) + " от всех" : undefined} />
            <KpiCard metric="cashShare" value={formatPercent(m.cashShare)} current={m.cashShare} previous={pm?.cashShare} previousLabel={pm ? vs(formatPercent(pm.cashShare)) : undefined} />
          </KpiRow>
          <Panel>
            <PanelHeader><PanelTitle>Динамика выручки по дням</PanelTitle></PanelHeader>
            <div className="p-4">{noOrders ? <EmptyState title="Нет заказов за период" hint="Данные появятся после первых оплаченных заказов." /> : <TimeSeriesChart data={revenueSeries} format="thousands" />}</div>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Donut data={categoryData} title="Структура по категориям" format="ruble" />
            <Donut data={paymentData} title="Способы оплаты" />
          </div>
          <Panel>
            <PanelHeader><PanelTitle>Топ-товаров</PanelTitle></PanelHeader>
            <RankTable rows={top} head={<><TH>Товар</TH><TH className="w-28 text-right">Продано</TH><TH className="w-40 text-right">Выручка</TH><TH className="w-20 text-right">Доля</TH></>}
              render={(p: { title: string; qty: number; revenue: number }, i) => (<TR key={i}><TD className="max-w-xs truncate">{p.title}</TD><TD className="text-right font-medium">{formatNumber(p.qty)}</TD><TD className="text-right">{formatPrice(p.revenue)}</TD><TD className="text-right text-ink-muted">{pct(p.revenue, topTotal)}</TD></TR>)} />
          </Panel>
          <Panel>
            <PanelHeader><PanelTitle>Воронка статусов</PanelTitle></PanelHeader>
            <div className="p-4">{statusData.length === 0 ? <EmptyState title="Нет данных" /> : <BarsChart data={statusData} horizontal height={Math.max(200, statusData.length * 38)} format="number" />}</div>
          </Panel>
        </div>
      </>
    );
  }

  /* ════════════ ПРОДАЖИ ════════════ */
  if (tab === "sales") {
    const ordersSeries: SeriesPoint[] = dayKeys.map((d) => ({ label: d.slice(5).replace("-", "."), value: ordByDay[d] ?? 0 }));
    const aovByDay: SeriesPoint[] = dayKeys.map((d) => ({ label: d.slice(5).replace("-", "."), value: Math.round(div(revByDay[d] ?? 0, ordByDay[d] ?? 0)) }));
    const pay: Record<string, { count: number; revenue: number }> = {};
    const del: Record<string, { count: number; revenue: number }> = {};
    for (const o of m.okOrders) {
      const pk = o.payment_method ?? "—"; (pay[pk] ??= { count: 0, revenue: 0 }); pay[pk].count++; pay[pk].revenue += o.total ?? 0;
      const dk = o.delivery_method ?? "—"; (del[dk] ??= { count: 0, revenue: 0 }); del[dk].count++; del[dk].revenue += o.total ?? 0;
    }
    const payRows = Object.entries(pay).map(([k, v]) => ({ label: PAYMENT_LABEL[k] ?? k, ...v })).sort((a, b) => b.revenue - a.revenue);
    const delRows = Object.entries(del).map(([k, v]) => ({ label: DELIVERY_LABEL[k] ?? k, ...v })).sort((a, b) => b.revenue - a.revenue);

    return (
      <>
        {header}
        {noOrders ? <EmptyState title="Нет заказов за период" hint="Данные появятся после первых оплаченных заказов." /> : (
          <div className="space-y-6">
            <KpiRow>
              <KpiCard metric="revenue" value={formatPrice(m.revenue)} current={m.revenue} />
              <KpiCard metric="orders" value={formatNumber(m.orders)} current={m.orders} />
              <KpiCard metric="aov" value={formatPrice(m.aov)} current={m.aov} />
              <KpiCard metric="units" value={formatNumber(m.units)} current={m.units} />
            </KpiRow>
            <Panel>
              <PanelHeader><PanelTitle>Выручка по дням</PanelTitle></PanelHeader>
              <div className="p-4"><TimeSeriesChart data={revenueSeries} format="thousands" /></div>
            </Panel>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel>
                <PanelHeader><PanelTitle>Заказы по дням</PanelTitle></PanelHeader>
                <div className="p-4"><TimeSeriesChart data={ordersSeries} format="number" height={200} /></div>
              </Panel>
              <Panel>
                <PanelHeader><PanelTitle>Средний чек по дням</PanelTitle></PanelHeader>
                <div className="p-4"><TimeSeriesChart data={aovByDay} format="thousands" height={200} /></div>
              </Panel>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel>
                <PanelHeader><PanelTitle>Способы оплаты</PanelTitle></PanelHeader>
                <RankTable rows={payRows} head={<><TH>Способ</TH><TH className="w-20 text-right">Заказов</TH><TH className="w-36 text-right">Выручка</TH><TH className="w-20 text-right">Доля</TH></>}
                  render={(r: { label: string; count: number; revenue: number }) => (<TR key={r.label}><TD>{r.label}</TD><TD className="text-right font-medium">{formatNumber(r.count)}</TD><TD className="text-right">{formatPrice(r.revenue)}</TD><TD className="text-right text-ink-muted">{pct(r.revenue, m.revenue)}</TD></TR>)} />
              </Panel>
              <Panel>
                <PanelHeader><PanelTitle>Доставка</PanelTitle></PanelHeader>
                <RankTable rows={delRows} head={<><TH>Способ</TH><TH className="w-20 text-right">Заказов</TH><TH className="w-36 text-right">Выручка</TH><TH className="w-20 text-right">Доля</TH></>}
                  render={(r: { label: string; count: number; revenue: number }) => (<TR key={r.label}><TD>{r.label}</TD><TD className="text-right font-medium">{formatNumber(r.count)}</TD><TD className="text-right">{formatPrice(r.revenue)}</TD><TD className="text-right text-ink-muted">{pct(r.revenue, m.revenue)}</TD></TR>)} />
              </Panel>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ════════════ ТОВАРЫ (ABC × XYZ) ════════════ */
  if (tab === "products") {
    const list = Object.values(prodStats).sort((a, b) => b.revenue - a.revenue);
    const totalRev = list.reduce((s, p) => s + p.revenue, 0);
    const buckets = dayKeys.length || 1;
    let cum = 0;
    const rows = list.map((p) => {
      cum += p.revenue;
      const cumShare = totalRev ? (cum / totalRev) * 100 : 0;
      const abc = cumShare <= 80 ? "A" : cumShare <= 95 ? "B" : "C";
      const daily = dayKeys.map((d) => p.byDay[d] ?? 0);
      const mean = daily.reduce((s, v) => s + v, 0) / buckets;
      const variance = daily.reduce((s, v) => s + (v - mean) ** 2, 0) / buckets;
      const cv = mean ? Math.sqrt(variance) / mean : 0;
      const xyz = cv < 0.5 ? "X" : cv <= 1 ? "Y" : "Z";
      return { ...p, abc, xyz, cumShare };
    });
    const abcCount = { A: 0, B: 0, C: 0 } as Record<string, number>;
    rows.forEach((r) => { abcCount[r.abc]++; });

    return (
      <>
        {header}
        {noOrders ? <EmptyState title="Нет продаж за период" hint="Список и ABC×XYZ появятся после первых заказов." /> : (
          <div className="space-y-6">
            <KpiRow>
              <KpiCard label="Позиций продано" value={formatNumber(list.length)} current={list.length} previousLabel="уникальных SKU" />
              <KpiCard label="Класс A" value={formatNumber(abcCount.A)} current={abcCount.A} previousLabel="≤80% выручки" />
              <KpiCard label="Класс B" value={formatNumber(abcCount.B)} current={abcCount.B} previousLabel="80–95%" />
              <KpiCard label="Класс C" value={formatNumber(abcCount.C)} current={abcCount.C} previousLabel="хвост 5%" />
            </KpiRow>
            <Donut data={Object.entries(catRev).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} title="Выручка по категориям" format="ruble" />
            <Panel>
              <PanelHeader><PanelTitle>ABC × XYZ по товарам</PanelTitle></PanelHeader>
              <RankTable rows={rows}
                head={<><TH>Товар</TH><TH className="w-20 text-right">Продано</TH><TH className="w-36 text-right">Выручка</TH><TH className="w-24 text-right">Накопл.</TH><TH className="w-14 text-center">ABC</TH><TH className="w-14 text-center">XYZ</TH></>}
                render={(r: { id: string; title: string; qty: number; revenue: number; cumShare: number; abc: string; xyz: string }) => (
                  <TR key={r.id}><TD className="max-w-xs truncate">{r.title}</TD><TD className="text-right font-medium">{formatNumber(r.qty)}</TD><TD className="text-right">{formatPrice(r.revenue)}</TD><TD className="text-right text-ink-muted">{r.cumShare.toFixed(0)}%</TD><TD className="text-center"><Tag tone={CLASS_TONE[r.abc]}>{r.abc}</Tag></TD><TD className="text-center"><Tag tone={CLASS_TONE[r.xyz]}>{r.xyz}</Tag></TD></TR>
                )} />
            </Panel>
            <p className="px-1 text-[12px] text-ink-subtle">ABC — вклад в выручку (A ≤80%, B 80–95%, C хвост). XYZ — стабильность спроса по дням (X — ровный, Y — переменный, Z — нерегулярный).</p>
          </div>
        )}
      </>
    );
  }

  /* ════════════ КЛИЕНТЫ (RFM / LTV) ════════════ */
  if (tab === "customers") {
    const { data: custRaw } = await db.from("customers").select("id,name,phone,total_orders,total_spent,segment,last_order_at,first_order_at").order("total_spent", { ascending: false }).limit(2000);
    const customers = (custRaw ?? []) as CustomerRow[];
    const now = Date.now();
    const SEGMENTS: Record<string, string> = { champion: "Чемпионы", loyal: "Лояльные", potential: "Перспективные", new: "Новые", at_risk: "В зоне риска", lost: "Потерянные" };
    function rfm(c: CustomerRow) {
      const recencyDays = c.last_order_at ? Math.floor((now - new Date(c.last_order_at).getTime()) / 86400000) : 9999;
      const R = recencyDays <= 30 ? 3 : recencyDays <= 90 ? 2 : 1;
      const F = c.total_orders >= 3 ? 3 : c.total_orders === 2 ? 2 : 1;
      const M = c.total_spent >= 200000 ? 3 : c.total_spent >= 100000 ? 2 : 1;
      let seg = "new";
      if (R === 3 && F >= 2 && M >= 2) seg = "champion";
      else if (F >= 2 && M >= 2) seg = "loyal";
      else if (R >= 2 && M >= 2) seg = "potential";
      else if (R === 1 && F >= 2) seg = "at_risk";
      else if (R === 1) seg = "lost";
      return { recencyDays, R, F, M, seg };
    }
    const enriched = customers.map((c) => ({ c, r: rfm(c) }));
    const totalCustomers = customers.length;
    const repeat = customers.filter((c) => c.total_orders >= 2).length;
    const avgLtv = div(customers.reduce((s, c) => s + c.total_spent, 0), totalCustomers);
    const segCount: Record<string, number> = {};
    for (const e of enriched) segCount[e.r.seg] = (segCount[e.r.seg] ?? 0) + 1;
    const segData: SeriesPoint[] = Object.entries(segCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: SEGMENTS[k] ?? k, value: v }));

    return (
      <>
        {header}
        {totalCustomers === 0 ? <EmptyState title="Клиентов пока нет" hint="Появятся после первых заказов." /> : (
          <div className="space-y-6">
            <KpiRow>
              <KpiCard label="Всего клиентов" value={formatNumber(totalCustomers)} current={totalCustomers} previousLabel="в базе" />
              <KpiCard label="Повторные" value={formatNumber(repeat)} current={repeat} previousLabel={totalCustomers ? `${pct(repeat, totalCustomers)} с 2+ заказами` : undefined} />
              <KpiCard label="Средний LTV" value={formatPrice(avgLtv)} current={avgLtv} previousLabel="выручка на клиента" />
              <KpiCard label="Чемпионы" value={formatNumber(segCount.champion ?? 0)} current={segCount.champion ?? 0} previousLabel="R+F+M высокие" />
            </KpiRow>
            <Donut data={segData} title="RFM-сегменты" />
            <Panel>
              <PanelHeader><PanelTitle>Клиенты — RFM</PanelTitle></PanelHeader>
              <RankTable rows={enriched}
                head={<><TH>Клиент</TH><TH className="w-28 text-right">Давность</TH><TH className="w-20 text-right">Заказов</TH><TH className="w-36 text-right">LTV</TH><TH className="w-32">Сегмент</TH></>}
                render={(e: { c: CustomerRow; r: { recencyDays: number; seg: string } }) => (
                  <TR key={e.c.id}><TD>{e.c.name || e.c.phone || "—"}</TD><TD className="text-right text-ink-muted">{e.r.recencyDays >= 9999 ? "—" : `${e.r.recencyDays} дн.`}</TD><TD className="text-right font-medium">{formatNumber(e.c.total_orders)}</TD><TD className="text-right">{formatPrice(e.c.total_spent)}</TD><TD>{SEGMENTS[e.r.seg] ?? e.r.seg}</TD></TR>
                )} />
            </Panel>
          </div>
        )}
      </>
    );
  }

  /* ════════════ ФИНАНСЫ ════════════ */
  if (tab === "finance") {
    const grossSubtotal = m.okOrders.reduce((s, o) => s + (o.subtotal ?? o.total ?? 0), 0);
    const discountCash = m.okOrders.reduce((s, o) => s + (o.discount_cash ?? 0), 0);
    const discountPromo = m.okOrders.reduce((s, o) => s + (o.discount_promo ?? 0), 0);
    const cashRev = m.okOrders.filter((o) => CASH_METHODS.has(o.payment_method ?? "")).reduce((s, o) => s + (o.total ?? 0), 0);
    const cardRev = m.revenue - cashRev;
    const discMap: Record<string, number> = {};
    for (const o of m.okOrders) { const d = o.created_at.slice(0, 10); discMap[d] = (discMap[d] ?? 0) + (o.discount_cash ?? 0) + (o.discount_promo ?? 0); }
    const discByDay: SeriesPoint[] = dayKeys.map((d) => ({ label: d.slice(5).replace("-", "."), value: discMap[d] ?? 0 }));

    return (
      <>
        {header}
        {noOrders ? <EmptyState title="Нет заказов за период" hint="Финансовые показатели появятся после первых продаж." /> : (
          <div className="space-y-6">
            <KpiRow>
              <KpiCard label="Выручка (нетто)" value={formatPrice(m.revenue)} current={m.revenue} previousLabel="оплачено клиентами" />
              <KpiCard label="Сумма до скидок" value={formatPrice(grossSubtotal)} current={grossSubtotal} previousLabel="прайс по карте" />
              <KpiCard label="Скидка за наличные" value={formatPrice(discountCash)} current={discountCash} previousLabel={grossSubtotal ? `${pct(discountCash, grossSubtotal)} от суммы` : undefined} />
              <KpiCard label="Промо-скидки" value={formatPrice(discountPromo)} current={discountPromo} previousLabel="по промокодам" />
            </KpiRow>
            <div className="grid gap-5 lg:grid-cols-2">
              <Donut data={[{ label: "Наличные / СБП", value: cashRev }, { label: "Карта / прочее", value: cardRev }]} title="Выручка по типу оплаты" format="ruble" />
              <Panel>
                <PanelHeader><PanelTitle>Скидки по дням</PanelTitle></PanelHeader>
                <div className="p-4"><TimeSeriesChart data={discByDay} format="thousands" height={200} /></div>
              </Panel>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ════════════ TRADE-IN ════════════ */
  return (
    <>
      {header}
      <EmptyState title="Trade-in готовится" hint="Раздел оживёт, когда появятся сделки trade-in (приём техники в зачёт). Сейчас таких операций в базе нет." />
    </>
  );
}
