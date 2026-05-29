import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { StepForm, type StepValue } from "../../../StepForm";

export const metadata: Metadata = { title: "Шаг" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("trade_in_steps").select("id,step_number,title,description,icon,sort_order").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={(data as StepValue).title} description="Редактирование шага." />
      <StepForm step={data as StepValue} />
    </>
  );
}
