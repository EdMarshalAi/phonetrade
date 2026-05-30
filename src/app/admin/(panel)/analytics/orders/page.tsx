import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart, DonutChart, BarsChart, type SeriesPoint } from "@/components/admin/Charts";
import { PAYMENT_LABEL, ORDER_STATUS } from "@/app/admin/(panel)/orders/labels";
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

function pct(n: number, total: number): string {
  return total === 0 ? "0%" : Math.round((n / total) * 100) + "%";
}

interface OrderRow {
  id: string; total: number; subtotal: number | null; discount_cash: number | null;
  status: string; payment_method: string | null; delivery_method: string | null;
  promo_code: string | null; created_at: string;
}
interface ItemRow { order_id: string; product_id: string | null; title: string | null; qty: number; total: number }
interface ProductRow { id: string; category_slug: string | null }

const CASH_METHODS = new Set(["sbp", "cash"]);

async function loadRange(db: ReturnType<typeof createSupabaseAdminClient>, range: Range, withItems: boolean) {
  const { data } = await db
    .from("orders")
    .select("id,total,subtotal,discount_cash,status,payment_method,delivery_method,promo_code,created_at")
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
    const res = await Promise.all(
      chunks.map((c) => db.from("order_items").select("order_id,product_id,title,qty,total").in("order_id", c).limit(10000))
    );
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
  return {
    revenue,
    orders: orders.length,
    aov: ok.length ? revenue / ok.length : 0,
    units,
    cancels,
    cashShare: ok.length ? (cash / ok.length) * 100 : 0,
    okOrders: ok,
    okIds,
  };
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
    compare ? loadRange(db, prevRange, true) : Promise.resolve(null),
    db.from("products").select("id,category_slug").limit(5000),
  ]);
  const products = (productsRaw ?? []) as ProductRow[];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const m = metricsOf(cur.orders, cur.items);
  const pm = prev ? metricsOf(prev.orders, prev.items) : null;

  // дневные ряды для sparkline и графика
  const dayKeys = daysInRange(range);
  const revByDay: Record<string, number> = {};
  const ordByDay: Record<string, number> = {};
  for (const o of m.okOrders) {
    const d = o.created_at.slice(0, 10);
    revByDay[d] = (revByDay[d] ?? 0) + (o.total ?? 0);
  }
  for (const o of cur.orders) {
    const d = o.created_at.slice(0, 10);
    ordByDay[d] = (ordByDay[d] ?? 0) + 1;
  }
  const revSpark = dayKeys.map((d) => revByDay[d] ?? 0);
  const ordSpark = dayKeys.map((d) => ordByDay[d] ?? 0);
  const revenueSeries: SeriesPoint[] = dayKeys.map((d) => ({ label: d.slice(5).replace("-", "."), value: revByDay[d] ?? 0 }));

  // структуры (текущий период)
  const catRev: Record<string, number> = {};
  const prodStats: Record<string, { title: string; qty: number; revenue: number }> = {};
  for (const it of cur.items) {
    if (!m.okIds.has(it.order_id)) continue;
    const slug = (it.product_id && productMap.get(it.product_id)?.category_slug) || "other";
    const cl = CATEGORY_LABEL[slug] ?? slug;
    catRev[cl] = (catRev[cl] ?? 0) + (it.total ?? 0);
    const key = it.product_id ?? it.title ?? "u";
    if (!prodStats[key]) prodStats[key] = { title: it.title ?? "—", qty: 0, revenue: 0 };
    prodStats[key].qty += it.qty ?? 0;
    prodStats[key].revenue += it.total ?? 0;
  }
  const categoryData: SeriesPoint[] = Object.entries(catRev).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  const topProducts = Object.values(prodStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topTotal = topProducts.reduce((s, p) => s + p.revenue, 0);

  const payCounts: Record<string, number> = {};
  for (const o of m.okOrders) { const k = o.payment_method ?? "—"; payCounts[k] = (payCounts[k] ?? 0) + 1; }
  const paymentData: SeriesPoint[] = Object.entries(payCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: PAYMENT_LABEL[k] ?? k, value: v }));

  const statusCounts: Record<string, number> = {};
  for (const o of cur.orders) { const s = o.status ?? "—"; statusCounts[s] = (statusCounts[s] ?? 0) + 1; }
  const order = ["placed", "new", "confirmed", "packing", "ready", "shipped", "delivered", "cancelled"];
  const statusData: SeriesPoint[] = order.filter((s) => statusCounts[s]).map((s) => ({ label: ORDER_STATUS[s] ?? s, value: statusCounts[s] }));

  const vs = (val: string) => (compare && pm ? `vs ${val} в прошлом периоде` : undefined);

  return (
    <>
      <PageHeader
        title="Аналитика заказов"
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
            <KpiCard metric="revenue" value={formatPrice(m.revenue)} current={m.revenue} previous={pm?.revenue} spark={revSpark} previousLabel={pm ? vs(formatPrice(pm.revenue)) : undefined} />
            <KpiCard metric="orders" value={formatNumber(m.orders)} current={m.orders} previous={pm?.orders} spark={ordSpark} previousLabel={pm ? vs(formatNumber(pm.orders)) : undefined} />
            <KpiCard metric="aov" value={formatPrice(m.aov)} current={m.aov} previous={pm?.aov} previousLabel={pm ? vs(formatPrice(pm.aov)) : undefined} />
            <KpiCard metric="units" value={formatNumber(m.units)} current={m.units} previous={pm?.units} previousLabel={pm ? vs(formatNumber(pm.units)) : undefined} />
            <KpiCard metric="cancels" value={`${formatNumber(m.cancels)}`} current={m.cancels} previous={pm?.cancels} previousLabel={m.orders ? pct(m.cancels, m.orders) + " от всех" : undefined} />
            <KpiCard metric="cashShare" value={formatPercent(m.cashShare)} current={m.cashShare} previous={pm?.cashShare} previousLabel={pm ? vs(formatPercent(pm.cashShare)) : undefined} />
          </KpiRow>

          <Panel>
            <PanelHeader><PanelTitle>Динамика выручки по дням</PanelTitle></PanelHeader>
            <div className="p-4">
              {m.okOrders.length === 0 ? (
                <EmptyState title="Нет заказов за период" hint="Данные появятся после первых оплаченных заказов." />
              ) : (
                <TimeSeriesChart data={revenueSeries} format="thousands" />
              )}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader><PanelTitle>Структура по категориям</PanelTitle></PanelHeader>
              <div className="p-4">{categoryData.length === 0 ? <EmptyState title="Нет данных" /> : <DonutChart data={categoryData} format="ruble" />}</div>
            </Panel>
            <Panel>
              <PanelHeader><PanelTitle>Способы оплаты</PanelTitle></PanelHeader>
              <div className="p-4">{paymentData.length === 0 ? <EmptyState title="Нет данных" /> : <DonutChart data={paymentData} format="number" />}</div>
            </Panel>
          </div>

          <Panel>
            <PanelHeader><PanelTitle>Топ-товаров</PanelTitle></PanelHeader>
            {topProducts.length === 0 ? (
              <div className="p-5"><EmptyState title="Нет данных" hint="Список появится после первых продаж." /></div>
            ) : (
              <Table>
                <THead><TH>Товар</TH><TH className="w-28 text-right">Продано</TH><TH className="w-40 text-right">Выручка</TH><TH className="w-20 text-right">Доля</TH></THead>
                <TBody>
                  {topProducts.map((p, i) => (
                    <TR key={i}>
                      <TD className="max-w-xs truncate">{p.title}</TD>
                      <TD className="text-right font-medium">{formatNumber(p.qty)}</TD>
                      <TD className="text-right">{formatPrice(p.revenue)}</TD>
                      <TD className="text-right text-ink-muted">{pct(p.revenue, topTotal)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Panel>

          <Panel>
            <PanelHeader><PanelTitle>Воронка статусов</PanelTitle></PanelHeader>
            <div className="p-4">{statusData.length === 0 ? <EmptyState title="Нет данных" /> : <BarsChart data={statusData} horizontal height={Math.max(200, statusData.length * 38)} format="number" />}</div>
          </Panel>
        </div>
      )}
    </>
  );
}
