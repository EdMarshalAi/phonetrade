import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deletePromo } from "./actions";

export const metadata: Metadata = { title: "Промокоды" };

const TYPE_LABEL: Record<string, string> = { percent: "%", fixed: "₽", free_shipping: "Бесплатная доставка" };

interface Row {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  used_count: number;
  total_limit: number | null;
  expires_at: string | null;
  is_active: boolean;
}

export default async function PromoPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("promo_codes").select("id,code,discount_type,discount_value,used_count,total_limit,expires_at,is_active").order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader
        title="Промокоды"
        description="Коды скидок для чекаута."
        actions={
          <Link href="/admin/promotions/promo-codes/new">
            <AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Добавить</AdminButton>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Промокодов пока нет"
          action={
            <Link href="/admin/promotions/promo-codes/new">
              <AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Создать промокод</AdminButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TH>Код</TH>
            <TH className="w-40">Скидка</TH>
            <TH className="w-28">Использовано</TH>
            <TH className="w-32">Действует до</TH>
            <TH className="w-24">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((p) => (
              <TR key={p.id}>
                <TD className="font-mono font-medium">{p.code}</TD>
                <TD className="text-ink-muted">
                  {p.discount_type === "free_shipping" ? "Бесплатная доставка" : `${p.discount_value} ${TYPE_LABEL[p.discount_type]}`}
                </TD>
                <TD className="text-ink-muted">{p.used_count}{p.total_limit ? ` / ${p.total_limit}` : ""}</TD>
                <TD className="text-ink-muted">{p.expires_at ? new Date(p.expires_at).toLocaleDateString("ru-RU") : "—"}</TD>
                <TD>{p.is_active ? <StatusBadge tone="strong">Активен</StatusBadge> : <StatusBadge>Выкл</StatusBadge>}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/promotions/promo-codes/${p.id}/edit`}>
                      <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                    </Link>
                    <DeleteButton action={deletePromo.bind(null, p.id)} itemName={p.code} iconOnly />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
