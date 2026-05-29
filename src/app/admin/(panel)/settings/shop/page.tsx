import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { ShopForm } from "./ShopForm";
import type { ShopGeneral } from "./actions";

export const metadata: Metadata = { title: "Настройки магазина" };

export default async function ShopSettingsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("shop_settings").select("value").eq("key", "general").maybeSingle();
  const initial = (data?.value ?? {}) as ShopGeneral;

  return (
    <>
      <PageHeader title="Настройки магазина" description="Контакты, адрес, часы, соцсети, юр.информация. Используются в шапке, футере и чекауте." />
      <ShopForm initial={initial} />
    </>
  );
}
