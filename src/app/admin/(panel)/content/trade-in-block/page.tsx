import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TradeInBlockForm, type TradeInBlockValue } from "./TradeInBlockForm";
import { deleteStep } from "./actions";

export const metadata: Metadata = { title: "Trade-in блок и шаги" };

interface StepRow {
  id: string;
  step_number: number;
  title: string;
  description: string | null;
  sort_order: number;
}

export default async function TradeInBlockPage() {
  const db = createSupabaseAdminClient();
  const [{ data: blockData }, { data: stepsData }] = await Promise.all([
    db.from("trade_in_block").select("id,block_title,block_description,button_text,button_link,image_url,is_published").limit(1).maybeSingle(),
    db.from("trade_in_steps").select("id,step_number,title,description,sort_order").order("sort_order"),
  ]);
  const block = (blockData ?? null) as TradeInBlockValue | null;
  const steps = (stepsData ?? []) as StepRow[];

  return (
    <>
      <PageHeader title="Trade-in блок и шаги" description="Тёмный промо-блок trade-in и секция «Как работает обмен»." />

      <TradeInBlockForm block={block} />

      <Panel>
        <PanelHeader>
          <PanelTitle>Шаги обмена</PanelTitle>
          <Link href="/admin/content/trade-in-block/steps/new">
            <AdminButton size="sm" variant="outline"><Plus className="h-4 w-4" strokeWidth={2} /> Добавить шаг</AdminButton>
          </Link>
        </PanelHeader>
        {steps.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Шагов пока нет" hint="Обычно их три: оценка → проверка → оплата." />
          </div>
        ) : (
          <Table>
            <THead>
              <TH className="w-16">№</TH>
              <TH>Заголовок</TH>
              <TH>Описание</TH>
              <TH className="w-px text-right">Действия</TH>
            </THead>
            <TBody>
              {steps.map((s) => (
                <TR key={s.id}>
                  <TD className="text-ink-muted">{s.step_number}</TD>
                  <TD className="font-medium">{s.title}</TD>
                  <TD className="max-w-md truncate text-ink-muted">{s.description ?? "—"}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/content/trade-in-block/steps/${s.id}/edit`}>
                        <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                      </Link>
                      <DeleteButton action={deleteStep.bind(null, s.id)} itemName={s.title} iconOnly />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
