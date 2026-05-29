import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { ShopForm } from "./ShopForm";
import type { ShopGeneral } from "./actions";
import { DEFAULT_SHOP_CONTACTS } from "@/lib/content";

export const metadata: Metadata = { title: "Общие настройки" };

export default async function ShopSettingsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db.from("shop_settings").select("value").eq("key", "general").maybeSingle();
  const initial = (data?.value ?? {}) as ShopGeneral;
  // По умолчанию показываем базовый набор контактов, если ещё не настроены.
  if (!Array.isArray(initial.contacts) || initial.contacts.length === 0) {
    initial.contacts = DEFAULT_SHOP_CONTACTS;
  }

  return (
    <>
      <PageHeader title="Общие" description="Основные данные, контакты и информация, юр.реквизиты. Используются в шапке, футере и чекауте." />
      <ShopForm initial={initial} />
    </>
  );
}
