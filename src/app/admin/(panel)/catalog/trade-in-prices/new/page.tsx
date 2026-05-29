import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { TradeInPriceForm } from "../TradeInPriceForm";

export const metadata: Metadata = { title: "Новая цена выкупа" };

export default function NewTradeInPricePage() {
  return (
    <>
      <PageHeader
        title="Новая цена выкупа"
        description="Базовая цена и коэффициенты состояний для модели."
      />
      <TradeInPriceForm />
    </>
  );
}
