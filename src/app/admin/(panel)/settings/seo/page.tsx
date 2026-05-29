import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { SeoForm } from "./SeoForm";
import type { SeoSettings } from "./actions";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoSettingsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("seo_settings").select("value").eq("key", "global").maybeSingle();
  const initial = (data?.value ?? {}) as SeoSettings;

  return (
    <>
      <PageHeader
        title="SEO"
        description="Шаблоны мета-тегов, robots.txt, OG-изображение, Schema.org."
      />
      <SeoForm initial={initial} />
    </>
  );
}
