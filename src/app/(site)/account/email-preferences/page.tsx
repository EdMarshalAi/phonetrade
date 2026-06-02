import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStorefrontUser } from "@/lib/auth/server-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmailPreferencesClient } from "./EmailPreferencesClient";

export const metadata: Metadata = { title: "Настройки email", robots: { index: false, follow: false } };

export default async function EmailPreferencesPage() {
  const user = await getStorefrontUser();
  if (!user) redirect("/auth/login?returnTo=/account/email-preferences");

  const db = createSupabaseAdminClient();
  const { data: cust } = await db.from("customers").select("id").eq("user_id", user.id).maybeSingle();
  let marketingOn = false;
  let serviceOn = true;
  if (cust) {
    const [{ data: mk }, { data: opt }] = await Promise.all([
      db.from("data_consents").select("id").eq("customer_id", cust.id).eq("consent_type", "marketing").is("revoked_at", null).limit(1),
      db.from("data_consents").select("id").eq("customer_id", cust.id).eq("consent_type", "service_optout").is("revoked_at", null).limit(1),
    ]);
    marketingOn = (mk?.length ?? 0) > 0;
    serviceOn = (opt?.length ?? 0) === 0; // нет активного отказа = включено
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[560px]">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Настройки email-уведомлений</h1>
        <p className="mt-1 text-[14px] text-ink-muted">Управляйте, какие письма мы вам присылаем.</p>
        <EmailPreferencesClient initialMarketing={marketingOn} initialService={serviceOn} />
      </div>
    </div>
  );
}
