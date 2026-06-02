import type { Metadata } from "next";
import Link from "next/link";
import { Plus, BarChart3 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deletePromo } from "./actions";
import { RestoreButton } from "./RestoreButton";

export const metadata: Metadata = { title: "Промокоды" };

const TYPE_LABEL: Record<string, string> = { percent: "%", fixed: "₽", free_shipping: "Бесплатная доставка" };
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

interface Row {
  id: string; code: string; discount_type: string; discount_value: number;
  used_count: number; total_limit: number | null; expires_at: string | null;
  is_active: boolean; deleted_at: string | null;
}
type Stats = { total_uses: number; paid_uses: number; total_discount_rub: number; total_revenue_rub: number; conversion_rate: number };

export default async function PromoPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const showDeleted = (await searchParams).deleted === "1";
  const db = createSupabaseAdminClient();
  let q = db.from("promo_codes").select("id,code,discount_type,discount_value,used_count,total_limit,expires_at,is_active,deleted_at").order("created_at", { ascending: false });
  if (!showDeleted) q = q.is("deleted_at", null);
  const { data } = await q;
  const rows = (data ?? []) as Row[];

  const stats = new Map<string, Stats>();
  await Promise.all(rows.map(async (r) => {
    const { data: s } = await db.rpc("get_promo_stats", { p_promo_id: r.id });
    stats.set(r.id, (s ?? {}) as Stats);
  }));

  return (
    <>
      <PageHeader
        title="Промокоды"
        description="Коды скидок и аналитика по ним."
        actions={
          <div className="flex items-center gap-2">
            <Link href={showDeleted ? "/admin/promotions/promo-codes" : "/admin/promotions/promo-codes?deleted=1"}>
              <AdminButton variant="outline" size="sm">{showDeleted ? "Скрыть удалённые" : "Показать удалённые"}</AdminButton>
            </Link>
            <Link href="/admin/promotions/promo-codes/new"><AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Добавить</AdminButton></Link>
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="Промокодов нет" action={<Link href="/admin/promotions/promo-codes/new"><AdminButton><Plus className="h-4 w-4" /> Создать</AdminButton></Link>} />
      ) : (
        <Table>
          <THead>
            <TH>Код</TH>
            <TH className="w-28">Скидка</TH>
            <TH className="w-24 text-right">Применений</TH>
            <TH className="w-20 text-right">Оплачено</TH>
            <TH className="w-24 text-right">Скидка ₽</TH>
            <TH className="w-28 text-right">Выручка ₽</TH>
            <TH className="w-20 text-right">Конверсия</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((p) => {
              const s = stats.get(p.id) ?? { total_uses: 0, paid_uses: 0, total_discount_rub: 0, total_revenue_rub: 0, conversion_rate: 0 };
              const deleted = !!p.deleted_at;
              return (
                <TR key={p.id} className={deleted ? "bg-surface/60" : undefined}>
                  <TD className="font-mono font-medium">
                    <Link href={`/admin/promotions/promo-codes/${p.id}`} className="hover:underline">{p.code}</Link>
                    {deleted ? <StatusBadge tone="danger" className="ml-2">Удалён</StatusBadge> : null}
                  </TD>
                  <TD className="text-ink-muted">{p.discount_type === "free_shipping" ? "Бесплатная доставка" : `${p.discount_value} ${TYPE_LABEL[p.discount_type]}`}</TD>
                  <TD className="text-right text-ink-muted">{s.total_uses}</TD>
                  <TD className="text-right text-ink-muted">{s.paid_uses}</TD>
                  <TD className="text-right text-ink-muted">{rub(s.total_discount_rub)}</TD>
                  <TD className="text-right font-medium">{rub(s.total_revenue_rub)}</TD>
                  <TD className="text-right text-ink-muted">{s.conversion_rate}%</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/promotions/promo-codes/${p.id}`} title="Аналитика"><AdminButton variant="outline" size="sm"><BarChart3 className="size-4" /></AdminButton></Link>
                      {deleted ? (
                        <RestoreButton id={p.id} />
                      ) : (
                        <>
                          <Link href={`/admin/promotions/promo-codes/${p.id}/edit`}><AdminButton variant="outline" size="sm">Изменить</AdminButton></Link>
                          <DeleteButton action={deletePromo.bind(null, p.id)} itemName={p.code} iconOnly />
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
