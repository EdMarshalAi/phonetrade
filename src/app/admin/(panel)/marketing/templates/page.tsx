import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Рассылки — шаблоны" };

const CAT_LABEL: Record<string, string> = { transactional: "Транзакционное", marketing: "Маркетинг", trigger: "Триггер" };

export default async function TemplatesPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("email_templates").select("slug,name,category,subject,thumbnail_url,is_active").order("category").order("name");
  const rows = (data ?? []) as { slug: string; name: string; category: string; subject: string; thumbnail_url: string | null; is_active: boolean }[];

  return (
    <>
      <PageHeader title="Шаблоны писем" description="14 готовых шаблонов. Редактируются тема, превью-текст, контент и хедер." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((t) => (
          <Link key={t.slug} href={`/admin/marketing/templates/${t.slug}`} className="group rounded-2xl border border-border/60 bg-white p-3 shadow-[0_1px_3px_rgba(29,29,31,0.04)] transition-colors hover:border-ink/20">
            <div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-surface">
              {t.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[13.5px] font-medium text-ink">{t.name}</p>
              {t.is_active ? null : <StatusBadge>выкл</StatusBadge>}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">{CAT_LABEL[t.category] ?? t.category}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
