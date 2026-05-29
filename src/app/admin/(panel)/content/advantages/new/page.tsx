import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { AdvantageForm } from "../AdvantageForm";

export const metadata: Metadata = { title: "Новое преимущество" };

export default function Page() {
  return (
    <>
      <PageHeader title="Новое преимущество" />
      <AdvantageForm />
    </>
  );
}
