import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PaymentForm } from "./PaymentForm";
import type { PaymentSettings } from "./actions";

export const metadata: Metadata = { title: "Оплата" };

export default async function PaymentSettingsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("shop_settings").select("value").eq("key", "payment").maybeSingle();
  const initial = (data?.value ?? {}) as PaymentSettings;

  return (
    <>
      <PageHeader
        title="Оплата"
        description="Способы оплаты, их провайдеры и условия рассрочки."
      />
      <PaymentForm initial={initial} />
    </>
  );
}
