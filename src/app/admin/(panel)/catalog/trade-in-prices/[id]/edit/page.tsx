import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { TradeInPriceForm, type TradeInPriceValue } from "../../TradeInPriceForm";

export const metadata: Metadata = { title: "Цена выкупа" };

export default async function EditTradeInPricePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("trade_in_prices")
    .select("id,model,base_price,coefficients")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const price = data as TradeInPriceValue;

  return (
    <>
      <PageHeader
        title={price.model}
        description="Редактирование цены выкупа и коэффициентов состояний."
      />
      <TradeInPriceForm price={price} />
    </>
  );
}
