import type { Metadata } from "next";
import Link from "next/link";
import { Send } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";

export const metadata: Metadata = { title: "Рассылки — кампании" };

const STATUS_LABEL: Record<string, string> = { draft: "Черновик", scheduled: "Запланирована", sending: "Отправка", sent: "Отправлена", cancelled: "Отменена", failed: "Ошибка" };

export default async function CampaignsPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("email_campaigns").select("id,name,status,segment_slug,recipient_count,sent_at,created_at").order("created_at", { ascending: false });
  const rows = (data ?? []) as { id: string; name: string; status: string; segment_slug: string | null; recipient_count: number; sent_at: string | null; created_at: string }[];

  const createBtn = (
    <Link href="/admin/marketing/campaigns/new">
      <span className="inline-flex h-10 items-center gap-2 rounded-sm bg-ink px-4 text-[14px] font-medium text-white transition-colors hover:bg-ink/90"><Send className="size-4" /> Создать кампанию</span>
    </Link>
  );

  return (
    <>
      <PageHeader title="Кампании" description="Ручные рассылки по сегментам клиентов." actions={createBtn} />
      {rows.length === 0 ? (
        <EmptyState title="Кампаний пока нет" hint="Создайте первую рассылку по сегменту подписчиков." action={createBtn} />
      ) : (
        <Table>
          <THead>
            <TH>Название</TH>
            <TH className="w-40">Сегмент</TH>
            <TH className="w-28">Получателей</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-36 whitespace-nowrap">Отправлена</TH>
          </THead>
          <TBody>
            {rows.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.name}</TD>
                <TD className="text-ink-muted">{c.segment_slug ?? "—"}</TD>
                <TD className="text-ink-muted">{c.recipient_count}</TD>
                <TD><StatusBadge tone={c.status === "sent" ? "strong" : "neutral"}>{STATUS_LABEL[c.status] ?? c.status}</StatusBadge></TD>
                <TD className="whitespace-nowrap text-ink-muted">{c.sent_at ? new Date(c.sent_at).toLocaleDateString("ru-RU") : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
