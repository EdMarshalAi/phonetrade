import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { NewOrderForm } from "../NewOrderForm";

export const metadata: Metadata = { title: "Новый заказ" };

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const db = createSupabaseAdminClient();

  const { data } = await db
    .from("products")
    .select("id,title,price_cash")
    .is("deleted_at", null)
    .eq("status", "published")
    .order("title")
    .limit(500);

  const products = (data ?? []) as { id: string; title: string; price_cash: number }[];

  const prefill = {
    name: sp.name ? decodeURIComponent(sp.name) : undefined,
    phone: sp.phone ? decodeURIComponent(sp.phone) : undefined,
    email: sp.email ? decodeURIComponent(sp.email) : undefined,
  };

  return (
    <>
      <PageHeader
        title="Новый заказ"
        description="Ручное создание заказа менеджером."
        actions={
          <Link href="/admin/orders">
            <AdminButton variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К списку
            </AdminButton>
          </Link>
        }
      />
      <NewOrderForm products={products} prefill={prefill} />
    </>
  );
}
