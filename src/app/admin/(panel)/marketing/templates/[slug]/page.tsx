import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TemplateEditor } from "./TemplateEditor";

export const metadata: Metadata = { title: "Шаблон письма" };

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createSupabaseAdminClient();
  const { data } = await db.from("email_templates").select("slug,name,category,subject,preview_text,html_content,variables,is_active").eq("slug", slug).maybeSingle();
  if (!data) notFound();

  return (
    <TemplateEditor
      template={{
        slug: data.slug, name: data.name, category: data.category,
        subject: data.subject, previewText: data.preview_text ?? "",
        html: data.html_content, variables: (data.variables ?? []) as string[], isActive: data.is_active,
      }}
    />
  );
}
