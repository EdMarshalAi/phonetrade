import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { BrandForm } from "../BrandForm";

export const metadata: Metadata = { title: "Новый бренд" };

export default function NewBrandPage() {
  return (
    <>
      <PageHeader title="Новый бренд" description="Логотип, ссылка и порядок в полосе брендов." />
      <BrandForm />
    </>
  );
}
