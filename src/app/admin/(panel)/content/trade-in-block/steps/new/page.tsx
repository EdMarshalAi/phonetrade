import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { StepForm } from "../../StepForm";

export const metadata: Metadata = { title: "Новый шаг" };

export default function Page() {
  return (
    <>
      <PageHeader title="Новый шаг обмена" />
      <StepForm />
    </>
  );
}
