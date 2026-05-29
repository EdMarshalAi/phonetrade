import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import { PageHeader, PlaceholderSection } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Цены выкупа Trade-in" };

export default function Page() {
  return (
    <>
      <PageHeader title="Цены выкупа Trade-in" description="Базовые цены выкупа по моделям и коэффициенты состояний." />
      <PlaceholderSection phase="Фазе 2 (Каталог)" icon={Repeat} />
    </>
  );
}
