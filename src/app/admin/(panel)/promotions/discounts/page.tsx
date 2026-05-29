import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { DiscountsForm } from "./DiscountsForm";
import type { DiscountsSettings } from "./actions";

export const metadata: Metadata = { title: "Скидки и акции" };

export default async function DiscountsPage() {
  await requireAdmin(["admin", "manager"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("shop_settings").select("value").eq("key", "discounts").maybeSingle();
  const initial = (data?.value ?? {}) as DiscountsSettings;

  return (
    <>
      <PageHeader
        title="Скидки и акции"
        description="Скидка за наличные, акции и бонусы постоянным клиентам."
      />
      <DiscountsForm initial={initial} />
    </>
  );
}
