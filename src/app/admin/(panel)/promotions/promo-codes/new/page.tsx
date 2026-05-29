import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { PromoForm } from "../PromoForm";

export const metadata: Metadata = { title: "Новый промокод" };

export default function Page() {
  return (
    <>
      <PageHeader title="Новый промокод" />
      <PromoForm />
    </>
  );
}
