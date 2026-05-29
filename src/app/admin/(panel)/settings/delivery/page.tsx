import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { DeliveryForm } from "./DeliveryForm";
import type { DeliverySettings } from "./actions";

export const metadata: Metadata = { title: "Доставка" };

export default async function DeliverySettingsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("shop_settings").select("value").eq("key", "delivery").maybeSingle();
  const initial = (data?.value ?? {}) as DeliverySettings;

  return (
    <>
      <PageHeader
        title="Доставка"
        description="Способы получения, зоны доставки, условия бесплатной доставки."
      />
      <DeliveryForm initial={initial} />
    </>
  );
}
