import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { TriggersClient, type TriggerRow } from "./TriggersClient";

export const metadata: Metadata = { title: "Рассылки — триггеры" };

function humanDelay(min: number): string {
  if (!min) return "сразу";
  if (min % 1440 === 0) return `+${min / 1440} дн`;
  if (min % 60 === 0) return `+${min / 60} ч`;
  return `+${min} мин`;
}

export default async function TriggersPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("email_triggers")
    .select("slug,name,description,event_type,delay_minutes,is_active,template_id,email_templates(slug,legal_category)")
    .order("event_type")
    .order("step_in_chain");

  const rows: TriggerRow[] = (data ?? []).map((t) => {
    const tpl = Array.isArray(t.email_templates) ? t.email_templates[0] : t.email_templates;
    return {
      slug: t.slug, name: t.name, description: t.description, isActive: t.is_active,
      delay: humanDelay(t.delay_minutes ?? 0),
      templateSlug: (tpl as { slug?: string } | null)?.slug ?? null,
      legalCategory: (tpl as { legal_category?: string } | null)?.legal_category ?? null,
    };
  });

  return (
    <>
      <PageHeader title="Триггерные рассылки" description="Автоматические письма по событиям. Транзакционные шлются всегда; маркетинговые — при согласии." />
      <TriggersClient rows={rows} />
    </>
  );
}
