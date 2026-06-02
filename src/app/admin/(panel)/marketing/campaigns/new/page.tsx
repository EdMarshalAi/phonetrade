import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { SEGMENT_LABELS, SEGMENT_VIEWS, getSegmentSize } from "@/lib/email/queue";
import { CampaignWizard, type WizardSegment, type WizardTemplate } from "./CampaignWizard";

export const metadata: Metadata = { title: "Новая кампания" };

export default async function NewCampaignPage() {
  const db = createSupabaseAdminClient();

  const slugs = Object.keys(SEGMENT_VIEWS);
  const sizes = await Promise.all(slugs.map((s) => getSegmentSize(s)));
  const segments: WizardSegment[] = slugs.map((slug, i) => ({ slug, label: SEGMENT_LABELS[slug] ?? slug, size: sizes[i] }));

  const { data: tpls } = await db
    .from("email_templates")
    .select("slug,name,subject,html_content,thumbnail_url")
    .eq("category", "marketing")
    .eq("is_active", true)
    .order("name");
  const templates: WizardTemplate[] = (tpls ?? []).map((t) => ({
    slug: t.slug, name: t.name, subject: t.subject, html: t.html_content, thumbnail: t.thumbnail_url ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Новая кампания"
        actions={
          <Link href="/admin/marketing/campaigns" className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-white px-3 text-[14px] font-medium text-ink hover:bg-surface">
            <ChevronLeft className="size-4" /> К кампаниям
          </Link>
        }
      />
      <CampaignWizard segments={segments} templates={templates} />
    </>
  );
}
