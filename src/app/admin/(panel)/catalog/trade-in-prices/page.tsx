import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { TradeInPricesClient, type PriceRow } from "./TradeInPricesClient";
import type { TradeInFormula } from "./actions";

export const metadata: Metadata = { title: "Базовые цены Trade-in" };

export default async function TradeInPricesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const db = createSupabaseAdminClient();

  let query = db
    .from("trade_in_base_prices")
    .select("id,model_key,model_title,memory_gb,base_price_rub,is_active,notes")
    .order("display_order", { ascending: true })
    .order("model_title", { ascending: false })
    .order("memory_gb", { ascending: false });
  if (q) query = query.ilike("model_title", `%${q}%`);

  const [{ data: priceData }, { data: settings }] = await Promise.all([
    query,
    db.from("trade_in_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const rows = (priceData ?? []) as PriceRow[];
  const formula = (settings ?? {}) as unknown as TradeInFormula;

  return (
    <>
      <PageHeader
        title="Базовые цены Trade-in"
        description="Цены выкупа моделей в идеальном состоянии. От них формула применяет коэффициенты за реальное состояние."
      />
      <TradeInPricesClient rows={rows} formula={formula} q={q} />
    </>
  );
}
