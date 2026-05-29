import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteTradeInPrice } from "./actions";

export const metadata: Metadata = { title: "Цены выкупа Trade-in" };

interface TradeInPriceRow {
  id: string;
  model: string;
  base_price: number;
  coefficients: {
    perfect?: number;
    good?: number;
    fair?: number;
    broken?: number;
  } | null;
  updated_at: string | null;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtCoeff(value: number | undefined): string {
  if (value == null) return "—";
  return value.toFixed(2);
}

export default async function TradeInPricesPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("trade_in_prices")
    .select("id,model,base_price,coefficients,updated_at")
    .order("model", { ascending: true });
  const rows = (data ?? []) as TradeInPriceRow[];

  return (
    <>
      <PageHeader
        title="Цены выкупа Trade-in"
        description="Базовые цены выкупа по моделям и коэффициенты состояний."
        actions={
          <Link href="/admin/catalog/trade-in-prices/new">
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
            </AdminButton>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Записей пока нет"
          hint="Добавьте базовые цены выкупа и коэффициенты для каждой модели."
          action={
            <Link href="/admin/catalog/trade-in-prices/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить запись
              </AdminButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TH>Модель</TH>
            <TH className="w-36">Базовая цена</TH>
            <TH className="w-24 text-center">Perfect</TH>
            <TH className="w-24 text-center">Good</TH>
            <TH className="w-24 text-center">Fair</TH>
            <TH className="w-24 text-center">Broken</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD className="font-medium">{row.model}</TD>
                <TD>{formatPrice(row.base_price)}</TD>
                <TD className="text-center text-ink-muted">
                  {fmtCoeff(row.coefficients?.perfect)}
                </TD>
                <TD className="text-center text-ink-muted">
                  {fmtCoeff(row.coefficients?.good)}
                </TD>
                <TD className="text-center text-ink-muted">
                  {fmtCoeff(row.coefficients?.fair)}
                </TD>
                <TD className="text-center text-ink-muted">
                  {fmtCoeff(row.coefficients?.broken)}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/catalog/trade-in-prices/${row.id}/edit`}>
                      <AdminButton variant="outline" size="sm">
                        Изменить
                      </AdminButton>
                    </Link>
                    <DeleteButton
                      action={deleteTradeInPrice.bind(null, row.id)}
                      itemName={row.model}
                      iconOnly
                    />
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
