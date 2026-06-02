import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { TimeSeriesChart } from "@/components/admin/Charts";

export const metadata: Metadata = { title: "Аналитика промокода" };

const rub = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("ru-RU")} ₽`;
const USE_STATUS: Record<string, { label: string; tone: "neutral" | "strong" | "danger" }> = {
  new: { label: "В работе", tone: "neutral" }, paid: { label: "Оплачен", tone: "strong" }, cancelled: { label: "Отменён", tone: "danger" },
};

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5">
      <p className="text-[12px] uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

type Stats = { total_uses: number; paid_uses: number; cancelled_uses: number; conversion_rate: number; total_discount_rub: number; total_revenue_rub: number; avg_cart_rub: number; unique_customers: number };

export default async function PromoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data: promo } = await db.from("promo_codes").select("id,code,discount_type,discount_value,is_active,deleted_at,created_at").eq("id", id).maybeSingle();
  if (!promo) notFound();

  const [statsRes, timelineRes, usagesRes] = await Promise.all([
    db.rpc("get_promo_stats", { p_promo_id: id }),
    db.rpc("get_promo_usage_timeline", { p_promo_id: id, p_days: 30 }),
    db.from("promo_code_usages").select("order_id,order_number_snapshot,customer_email_snapshot,cart_subtotal_rub,discount_amount_rub,order_status_at_use,created_at").eq("promo_code_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  const s = (statsRes.data ?? {}) as Stats;
  const timeline = (timelineRes.data ?? []) as { date: string; total_uses: number }[];
  const usages = (usagesRes.data ?? []) as { order_id: string | null; order_number_snapshot: string | null; customer_email_snapshot: string | null; cart_subtotal_rub: number; discount_amount_rub: number; order_status_at_use: string; created_at: string }[];
  const chart = timeline.map((t) => ({ label: new Date(t.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }), value: t.total_uses }));
  const typeLabel = promo.discount_type === "free_shipping" ? "Бесплатная доставка" : promo.discount_type === "fixed" ? `${promo.discount_value} ₽` : `${promo.discount_value}%`;

  return (
    <>
      <PageHeader
        title={promo.code}
        description={`Скидка ${typeLabel} · создан ${new Date(promo.created_at).toLocaleDateString("ru-RU")}`}
        actions={
          <Link href="/admin/promotions/promo-codes" className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-white px-3 text-[14px] font-medium text-ink hover:bg-surface">
            <ChevronLeft className="size-4" /> К промокодам
          </Link>
        }
      />
      {promo.deleted_at ? <div className="mb-4"><StatusBadge tone="danger">Удалён — в чекауте не работает, аналитика сохранена</StatusBadge></div> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Применений" value={String(s.total_uses ?? 0)} />
        <Tile label="Оплачено" value={String(s.paid_uses ?? 0)} hint={`${s.cancelled_uses ?? 0} отменено`} />
        <Tile label="Конверсия" value={`${s.conversion_rate ?? 0}%`} />
        <Tile label="Выручка" value={rub(s.total_revenue_rub ?? 0)} hint={`средний чек ${rub(s.avg_cart_rub ?? 0)}`} />
        <Tile label="Скидка дана" value={rub(s.total_discount_rub ?? 0)} />
        <Tile label="Уникальных клиентов" value={String(s.unique_customers ?? 0)} />
      </div>

      <h2 className="mb-2 mt-8 text-[15px] font-semibold text-ink">Применений по дням (30 дней)</h2>
      <div className="rounded-2xl border border-border/60 bg-white p-4">
        {chart.length ? <TimeSeriesChart data={chart} /> : <p className="py-8 text-center text-[13px] text-ink-muted">Пока нет данных.</p>}
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Заказы с этим промокодом</h2>
      {usages.length === 0 ? (
        <EmptyState title="Применений ещё не было" hint="Здесь появятся заказы, в которых использовали промокод." />
      ) : (
        <Table>
          <THead>
            <TH>Заказ</TH>
            <TH>Клиент</TH>
            <TH className="w-28 text-right">Корзина</TH>
            <TH className="w-24 text-right">Скидка</TH>
            <TH className="w-28">Статус</TH>
          </THead>
          <TBody>
            {usages.map((u, i) => {
              const st = USE_STATUS[u.order_status_at_use] ?? USE_STATUS.new;
              return (
                <TR key={i}>
                  <TD className="font-medium">
                    {u.order_id ? <Link href={`/admin/orders/${u.order_id}`} className="hover:underline">{u.order_number_snapshot ?? "—"}</Link> : (u.order_number_snapshot ?? "—")}
                  </TD>
                  <TD className="text-ink-muted">{u.customer_email_snapshot ?? "—"}</TD>
                  <TD className="text-right text-ink-muted">{rub(u.cart_subtotal_rub)}</TD>
                  <TD className="text-right text-ink-muted">{rub(u.discount_amount_rub)}</TD>
                  <TD><StatusBadge tone={st.tone}>{st.label}</StatusBadge></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
