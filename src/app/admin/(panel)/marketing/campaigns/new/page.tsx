import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Новая кампания" };

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        title="Новая кампания"
        actions={
          <Link href="/admin/marketing/campaigns" className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-white px-3 text-[14px] font-medium text-ink hover:bg-surface">
            <ChevronLeft className="size-4" /> К кампаниям
          </Link>
        }
      />
      <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-10 text-center">
        <p className="text-[15px] font-medium text-ink">Визард отправки кампаний — в следующей итерации</p>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-muted">
          Фундамент готов: сегменты, шаблоны и движок отправки уже работают. Здесь появится мастер в 3 шага
          (сегмент → шаблон и текст → расписание) с тест-отправкой и предпросмотром.
        </p>
      </div>
    </>
  );
}
