import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { IntegrationsForm } from "./IntegrationsForm";
import type { IntegrationRow } from "./actions";

export const metadata: Metadata = { title: "Интеграции" };

export default async function IntegrationsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("integrations").select("key, config, is_enabled");
  const rows = (data ?? []) as IntegrationRow[];

  return (
    <>
      <PageHeader
        title="Интеграции"
        description="Эквайринг, аналитика, карты, SMTP и прочие внешние сервисы."
      />
      <IntegrationsForm rows={rows} />
    </>
  );
}
