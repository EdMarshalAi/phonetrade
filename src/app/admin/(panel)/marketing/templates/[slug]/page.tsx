import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TemplateEditor } from "./TemplateEditor";

export const metadata: Metadata = { title: "Шаблон письма" };

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("email_templates").select("slug,name,category,legal_category,subject,preview_text,html_content,content,is_active").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const c = (data.content ?? {}) as Record<string, string>;

  return (
    <TemplateEditor
      template={{
        slug: data.slug, name: data.name, category: data.category,
        legalCategory: data.legal_category ?? "marketing",
        subject: data.subject, previewText: data.preview_text ?? "",
        html: data.html_content, isActive: data.is_active,
        content: {
          heading: c.heading ?? "", body: c.body ?? "", cta_text: c.cta_text ?? "",
          cta_url: c.cta_url ?? "", header_image: c.header_image ?? "",
        },
      }}
    />
  );
}
