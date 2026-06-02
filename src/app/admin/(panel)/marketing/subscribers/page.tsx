import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";

export const metadata: Metadata = { title: "Рассылки — подписчики" };

export default async function SubscribersPage() {
  const db = createSupabaseAdminClient();
  const { data, count } = await db
    .from("segment_all_subscribers")
    .select("id,email,name", { count: "exact" })
    .order("name", { ascending: true })
    .limit(500);
  const rows = (data ?? []) as { id: string; email: string; name: string | null }[];

  return (
    <>
      <PageHeader title="База подписчиков" description={`${count ?? 0} с активным согласием на маркетинг. Показаны первые 500.`} />
      {rows.length === 0 ? (
        <EmptyState title="Подписчиков пока нет" hint="Появятся, когда клиенты дадут согласие на рассылки при регистрации или в заказе." />
      ) : (
        <Table>
          <THead>
            <TH>Имя</TH>
            <TH>Email</TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.name || "—"}</TD>
                <TD className="text-ink-muted">{r.email}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
