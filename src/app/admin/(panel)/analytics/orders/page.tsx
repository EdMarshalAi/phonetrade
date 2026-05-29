import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart, DonutChart, BarsChart, type SeriesPoint } from "@/components/admin/Charts";
import { FilterSelect } from "@/components/admin/ListControls";
import { ORDER_STATUS, PAYMENT_LABEL, DELIVERY_LABEL } from "@/app/admin/(panel)/orders/labels";

export const metadata: Metadata = { title: "Аналитика заказов" };

/* ── helpers ─────────────────────────────────────────────────────────────── */

const CATEGORY_LABEL: Record<string, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  mac: "Mac",
  watch: "Apple Watch",
  airpods: "AirPods",
  accessories: "Аксессуары",
  "trade-in": "Trade-in",
  used: "Б/у техника",
};

const RU = new Intl.NumberFormat("ru-RU");
const RUC = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

function rub(n: number) {
  return RUC.format(Math.round(n)) + " ₽";
}

function pct(n: number, total: number) {
  if (total === 0) return "0%";
  return Math.round((n / total) * 100) + "%";
}

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

/* ── types ───────────────────────────────────────────────────────────────── */

interface OrderRow {
  id: string;
  order_number: string | null;
  total: number;
  subtotal: number | null;
  discount_cash: number | null;
  status: string;
  payment_method: string | null;
  delivery_method: string | null;
  promo_code: string | null;
  created_at: string;
  customer_id: string | null;
}

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  title: string | null;
  qty: number;
  total: number;
}

interface ProductRow {
  id: string;
  title: string | null;
  category_slug: string | null;
}

/* ── KPI card ────────────────────────────────────────────────────────────── */

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border/70 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">{label}</span>
      <span className="text-2xl font-semibold tracking-tight text-ink">{value}</span>
      {sub && <span className="text-[13px] text-ink-muted">{sub}</span>}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default async function OrdersAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // "analytics" role not yet in AdminRole union — grant access to admin + manager
  await requireAdmin(["admin","manager","analytics"]);

  const params = await searchParams;
  const daysRaw = typeof params.days === "string" ? params.days : "30";
  const days = daysRaw === "7" ? 7 : daysRaw === "90" ? 90 : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const db = createSupabaseAdminClient();

  /* ── fetch ─────────────────────────────────────────────────────────────── */

  const [{ data: ordersRaw }, { data: productsRaw }] = await Promise.all([
    db
      .from("orders")
      .select(
        "id,order_number,total,subtotal,discount_cash,status,payment_method,delivery_method,promo_code,created_at,customer_id"
      )
      .is("deleted_at", null)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(5000),
    db.from("products").select("id,title,category_slug").limit(5000),
  ]);

  const orders = (ordersRaw ?? []) as OrderRow[];
  const products = (productsRaw ?? []) as ProductRow[];

  // Fetch order_items only for the orders we got
  let items: OrderItemRow[] = [];
  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);
    // Supabase .in() supports up to ~1000; chunk if needed
    const CHUNK = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < orderIds.length; i += CHUNK) chunks.push(orderIds.slice(i, i + CHUNK));
    const results = await Promise.all(
      chunks.map((ids) =>
        db
          .from("order_items")
          .select("order_id,product_id,title,qty,total")
          .in("order_id", ids)
          .limit(10000)
      )
    );
    items = results.flatMap((r) => (r.data ?? []) as OrderItemRow[]);
  }

  /* ── product lookup map ─────────────────────────────────────────────────── */

  const productMap = new Map<string, ProductRow>();
  for (const p of products) productMap.set(p.id, p);

  /* ── derived sets ───────────────────────────────────────────────────────── */

  const nonCancelledOrders = orders.filter((o) => o.status !== "cancelled");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");
  const nonCancelledIds = new Set(nonCancelledOrders.map((o) => o.id));
  const totalRevenue = nonCancelledOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const totalOrders = orders.length;
  const aov = nonCancelledOrders.length > 0 ? totalRevenue / nonCancelledOrders.length : 0;
  const totalUnitsSold = items
    .filter((it) => nonCancelledIds.has(it.order_id))
    .reduce((s, it) => s + (it.qty ?? 0), 0);
  const cancelRate = pct(cancelledOrders.length, totalOrders);

  // Payment split: sbp/cash (наличные) vs card/on_delivery/installment/credit
  const cashMethods = new Set(["sbp", "cash"]);
  const cashCount = nonCancelledOrders.filter((o) => cashMethods.has(o.payment_method ?? "")).length;
  const cardCount = nonCancelledOrders.length - cashCount;
  const cashShare = pct(cashCount, nonCancelledOrders.length);
  const cardShare = pct(cardCount, nonCancelledOrders.length);

  /* ── А: динамика выручки по дням ──────────────────────────────────────── */

  const dayLabels = lastNDays(days);
  const revenueByDay: Record<string, number> = {};
  for (const o of nonCancelledOrders) {
    const d = o.created_at.slice(0, 10);
    revenueByDay[d] = (revenueByDay[d] ?? 0) + (o.total ?? 0);
  }
  const revenueSeries: SeriesPoint[] = dayLabels.map((d) => ({
    label: d.slice(5).replace("-", "."),
    value: revenueByDay[d] ?? 0,
  }));

  /* ── Б: структура по категориям ──────────────────────────────────────── */

  const categoryRevenue: Record<string, number> = {};
  for (const it of items) {
    if (!nonCancelledIds.has(it.order_id)) continue;
    const prod = it.product_id ? productMap.get(it.product_id) : null;
    const slug = prod?.category_slug ?? "other";
    const label = CATEGORY_LABEL[slug] ?? slug;
    categoryRevenue[label] = (categoryRevenue[label] ?? 0) + (it.total ?? 0);
  }
  const categoryData: SeriesPoint[] = Object.entries(categoryRevenue)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  /* ── В: топ-товаров ──────────────────────────────────────────────────── */

  const productStats: Record<string, { title: string; qty: number; revenue: number }> = {};
  for (const it of items) {
    if (!nonCancelledIds.has(it.order_id)) continue;
    const key = it.product_id ?? it.title ?? "unknown";
    const title = it.title ?? it.product_id ?? "—";
    if (!productStats[key]) productStats[key] = { title, qty: 0, revenue: 0 };
    productStats[key].qty += it.qty ?? 0;
    productStats[key].revenue += it.total ?? 0;
  }
  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);
  const topRevTotal = topProducts.reduce((s, p) => s + p.revenue, 0);

  /* ── Д: способы оплаты ───────────────────────────────────────────────── */

  const paymentCounts: Record<string, number> = {};
  for (const o of nonCancelledOrders) {
    const m = o.payment_method ?? "unknown";
    paymentCounts[m] = (paymentCounts[m] ?? 0) + 1;
  }
  const paymentData: SeriesPoint[] = Object.entries(paymentCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      label: PAYMENT_LABEL[key] ?? key,
      value,
    }));

  /* ── Е: способы получения ────────────────────────────────────────────── */

  const deliveryCounts: Record<string, number> = {};
  for (const o of nonCancelledOrders) {
    const m = o.delivery_method ?? "unknown";
    deliveryCounts[m] = (deliveryCounts[m] ?? 0) + 1;
  }
  const deliveryData: SeriesPoint[] = Object.entries(deliveryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      label: DELIVERY_LABEL[key] ?? key,
      value,
    }));

  /* ── Ж: воронка статусов ─────────────────────────────────────────────── */

  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    const s = o.status ?? "unknown";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }
  // Order by funnel sequence
  const funnelOrder = ["placed", "new", "confirmed", "packing", "ready", "shipped", "delivered", "cancelled"];
  const statusData: SeriesPoint[] = funnelOrder
    .filter((s) => statusCounts[s] !== undefined)
    .map((s) => ({
      label: ORDER_STATUS[s] ?? s,
      value: statusCounts[s],
    }));
  // Add any unexpected statuses
  for (const [s, n] of Object.entries(statusCounts)) {
    if (!funnelOrder.includes(s)) statusData.push({ label: s, value: n });
  }

  /* ── К: промокоды ────────────────────────────────────────────────────── */

  const promoStats: Record<string, { count: number; discount: number }> = {};
  for (const o of orders) {
    if (!o.promo_code) continue;
    const code = o.promo_code.toUpperCase();
    if (!promoStats[code]) promoStats[code] = { count: 0, discount: 0 };
    promoStats[code].count += 1;
    promoStats[code].discount += o.discount_cash ?? 0;
  }
  const promoCodes = Object.entries(promoStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);

  /* ── description ─────────────────────────────────────────────────────── */

  const periodLabel = days === 7 ? "7 дней" : days === 90 ? "90 дней" : "30 дней";

  return (
    <>
      {/* Header + period selector */}
      <PageHeader
        title="Аналитика заказов"
        description={`Период: последние ${periodLabel}. Всего заказов: ${RU.format(totalOrders)}, выручка: ${rub(totalRevenue)}.`}
        actions={
          <FilterSelect
            param="days"
            options={[
              { value: "7", label: "7 дней" },
              { value: "30", label: "30 дней" },
              { value: "90", label: "90 дней" },
            ]}
            allLabel="30 дней"
          />
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Выручка" value={rub(totalRevenue)} />
        <KpiCard label="Заказов" value={RU.format(totalOrders)} />
        <KpiCard label="Средний чек" value={rub(aov)} sub={nonCancelledOrders.length > 0 ? `по ${nonCancelledOrders.length} завершённым` : "нет заказов"} />
        <KpiCard label="Продано штук" value={RU.format(totalUnitsSold)} />
        <KpiCard
          label="Отмены"
          value={RU.format(cancelledOrders.length)}
          sub={totalOrders > 0 ? `${cancelRate} от всех` : undefined}
        />
        <KpiCard
          label="Нал / СБП vs Карта"
          value={`${cashShare} / ${cardShare}`}
          sub={nonCancelledOrders.length > 0 ? `${cashCount} нал+СБП, ${cardCount} карта` : undefined}
        />
      </div>

      {/* А: Динамика выручки */}
      <Panel>
        <PanelHeader>
          <PanelTitle>А. Динамика выручки по дням</PanelTitle>
        </PanelHeader>
        <div className="p-4">
          {nonCancelledOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-subtle">
              Нет заказов за выбранный период.
            </p>
          ) : (
            <TimeSeriesChart
              data={revenueSeries}
              valueFormatter={(v) => `${Math.round(v / 1000)}к`}
            />
          )}
        </div>
      </Panel>

      {/* Б + Д: категории и оплата */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Б. Структура по категориям</PanelTitle>
          </PanelHeader>
          <div className="p-4">
            {categoryData.length === 0 ? (
              <EmptyState title="Нет данных" hint="Будут доступны после первых заказов." />
            ) : (
              <DonutChart
                data={categoryData}
                valueFormatter={(v) => rub(v)}
              />
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Д. Способы оплаты</PanelTitle>
          </PanelHeader>
          <div className="p-4">
            {paymentData.length === 0 ? (
              <EmptyState title="Нет данных" />
            ) : (
              <DonutChart
                data={paymentData}
                valueFormatter={(v) => String(v) + " заказов"}
              />
            )}
          </div>
        </Panel>
      </div>

      {/* В: Топ-товаров */}
      <Panel>
        <PanelHeader>
          <PanelTitle>В. Топ‑товаров</PanelTitle>
        </PanelHeader>
        {topProducts.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Нет данных" hint="Список появится после первых продаж." />
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Товар</TH>
              <TH className="w-28 text-right">Продано, шт.</TH>
              <TH className="w-40 text-right">Выручка</TH>
              <TH className="w-20 text-right">Доля</TH>
            </THead>
            <TBody>
              {topProducts.map((p, i) => (
                <TR key={i}>
                  <TD className="max-w-xs truncate">{p.title}</TD>
                  <TD className="text-right font-medium">{RU.format(p.qty)}</TD>
                  <TD className="text-right">{rub(p.revenue)}</TD>
                  <TD className="text-right text-ink-muted">{pct(p.revenue, topRevTotal)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      {/* Е + Ж: доставка и воронка */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Е. Способы получения</PanelTitle>
          </PanelHeader>
          {deliveryData.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Нет данных" />
            </div>
          ) : (
            <Table>
              <THead>
                <TH>Способ</TH>
                <TH className="w-28 text-right">Заказов</TH>
                <TH className="w-20 text-right">Доля</TH>
              </THead>
              <TBody>
                {deliveryData.map((d, i) => (
                  <TR key={i}>
                    <TD>{d.label}</TD>
                    <TD className="text-right font-medium">{RU.format(d.value)}</TD>
                    <TD className="text-right text-ink-muted">
                      {pct(d.value, nonCancelledOrders.length)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Ж. Воронка статусов</PanelTitle>
          </PanelHeader>
          {statusData.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Нет данных" />
            </div>
          ) : (
            <div className="p-4">
              <BarsChart
                data={statusData}
                horizontal
                height={Math.max(200, statusData.length * 38)}
                valueFormatter={(v) => String(v)}
              />
            </div>
          )}
        </Panel>
      </div>

      {/* К: Промокоды */}
      <Panel>
        <PanelHeader>
          <PanelTitle>К. Промокоды</PanelTitle>
        </PanelHeader>
        {promoCodes.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Промокоды не применялись" hint="Здесь будет статистика по промокодам, как только покупатели начнут ими пользоваться." />
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Код</TH>
              <TH className="w-32 text-right">Применений</TH>
              <TH className="w-40 text-right">Сумма скидки</TH>
            </THead>
            <TBody>
              {promoCodes.map(([code, stats], i) => (
                <TR key={i}>
                  <TD className="font-mono text-[13px] uppercase tracking-wider">{code}</TD>
                  <TD className="text-right font-medium">{RU.format(stats.count)}</TD>
                  <TD className="text-right text-ink-muted">{rub(stats.discount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
