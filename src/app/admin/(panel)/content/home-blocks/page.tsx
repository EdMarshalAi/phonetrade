import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getHomeBlocksVisibility } from "@/lib/content";
import { PageHeader, Panel, PanelHeader, PanelTitle, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { VisibilityControls } from "./VisibilityControls";
import { deleteBentoTile } from "../bento/actions";
import { deleteAdvantage } from "../advantages/actions";
import { deleteStep } from "../trade-in-block/actions";
import { TradeInBlockForm, type TradeInBlockValue } from "../trade-in-block/TradeInBlockForm";

export const metadata: Metadata = { title: "Блоки на главной" };

const TABS = [
  { key: "bento", label: "Bento-плитки" },
  { key: "trade-in", label: "Trade-in блок и шаги" },
  { key: "advantages", label: "Преимущества" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function HomeBlocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tab: TabKey = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "bento") as TabKey;
  const visibility = await getHomeBlocksVisibility();
  const db = createSupabaseAdminClient();

  return (
    <>
      <PageHeader title="Блоки на главной" description="Управление блоками главной страницы: видимость, плитки, trade-in, преимущества." />

      <VisibilityControls initial={visibility} />

      {/* Табы */}
      <div className="flex flex-wrap gap-1 border-b border-border/70">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/content/home-blocks?tab=${t.key}`}
            className={cn(
              "relative px-3.5 py-2 text-[13.5px] font-medium transition-colors",
              tab === t.key ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key ? <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-ink" /> : null}
          </Link>
        ))}
      </div>

      {tab === "bento" ? <BentoTab db={db} /> : null}
      {tab === "trade-in" ? <TradeInTab db={db} /> : null}
      {tab === "advantages" ? <AdvantagesTab db={db} /> : null}
    </>
  );
}

type DB = ReturnType<typeof createSupabaseAdminClient>;

/* ── Bento ───────────────────────────────────────────────────────────── */
async function BentoTab({ db }: { db: DB }) {
  const { data } = await db
    .from("bento_tiles")
    .select("id,category_slug,custom_title,custom_image_url,size,is_published")
    .order("sort_order");
  const rows = (data ?? []) as {
    id: string;
    category_slug: string | null;
    custom_title: string | null;
    custom_image_url: string | null;
    size: string;
    is_published: boolean;
  }[];
  return (
    <Section addHref="/admin/content/bento/new" addLabel="Добавить плитку">
      {rows.length === 0 ? (
        <EmptyState title="Плиток пока нет" hint="Без плиток на главной показывается стандартная раскладка по категориям." />
      ) : (
        <Table>
          <THead>
            <TH className="w-16">Превью</TH>
            <TH>Заголовок</TH>
            <TH className="w-24">Размер</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD>
                  <div className="flex h-9 w-12 items-center justify-center overflow-hidden rounded-sm border border-border/60 bg-surface">
                    {r.custom_image_url ? (
                      <Image src={r.custom_image_url} alt="" width={48} height={36} className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff className="h-4 w-4 text-ink-subtle" strokeWidth={1.5} />
                    )}
                  </div>
                </TD>
                <TD className="font-medium">{r.custom_title || r.category_slug || "Категория"}</TD>
                <TD className="text-ink-muted">{r.size}</TD>
                <TD>{r.is_published ? <StatusBadge tone="strong">Показана</StatusBadge> : <StatusBadge>Скрыта</StatusBadge>}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/content/bento/${r.id}/edit`}>
                      <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                    </Link>
                    <DeleteButton action={deleteBentoTile.bind(null, r.id)} itemName={r.custom_title || "плитку"} iconOnly />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Section>
  );
}

/* ── Advantages ──────────────────────────────────────────────────────── */
async function AdvantagesTab({ db }: { db: DB }) {
  const { data } = await db.from("advantages").select("id,icon,title,sort_order,is_published").order("sort_order");
  const rows = (data ?? []) as { id: string; icon: string | null; title: string; sort_order: number; is_published: boolean }[];
  return (
    <Section addHref="/admin/content/advantages/new" addLabel="Добавить преимущество">
      {rows.length === 0 ? (
        <EmptyState title="Преимуществ пока нет" />
      ) : (
        <Table>
          <THead>
            <TH className="w-20">Порядок</TH>
            <TH>Заголовок</TH>
            <TH>Иконка</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="text-ink-muted">{r.sort_order}</TD>
                <TD className="font-medium">{r.title}</TD>
                <TD className="text-ink-muted">{r.icon ?? "—"}</TD>
                <TD>{r.is_published ? <StatusBadge tone="strong">Показано</StatusBadge> : <StatusBadge>Скрыто</StatusBadge>}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/content/advantages/${r.id}/edit`}>
                      <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                    </Link>
                    <DeleteButton action={deleteAdvantage.bind(null, r.id)} itemName={r.title} iconOnly />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Section>
  );
}

/* ── Trade-in ────────────────────────────────────────────────────────── */
async function TradeInTab({ db }: { db: DB }) {
  const [{ data: blockData }, { data: stepsData }] = await Promise.all([
    db.from("trade_in_block").select("id,block_title,block_description,button_text,button_link,image_url,is_published").limit(1).maybeSingle(),
    db.from("trade_in_steps").select("id,step_number,title,description,sort_order").order("sort_order"),
  ]);
  const block = (blockData ?? null) as TradeInBlockValue | null;
  const steps = (stepsData ?? []) as { id: string; step_number: number; title: string; description: string | null }[];

  return (
    <div className="space-y-5">
      <TradeInBlockForm block={block} />
      <Panel>
        <PanelHeader>
          <PanelTitle>Шаги обмена</PanelTitle>
          <Link href="/admin/content/trade-in-block/steps/new">
            <AdminButton size="sm" variant="outline"><Plus className="h-4 w-4" strokeWidth={2} /> Добавить шаг</AdminButton>
          </Link>
        </PanelHeader>
        {steps.length === 0 ? (
          <div className="p-5"><EmptyState title="Шагов пока нет" hint="Обычно их три: оценка → проверка → оплата." /></div>
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
    </div>
  );
}

/* ── Обёртка вкладки со списком + кнопкой добавления ──────────────────── */
function Section({ addHref, addLabel, children }: { addHref: string; addLabel: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={addHref}>
          <AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> {addLabel}</AdminButton>
        </Link>
      </div>
      {children}
    </div>
  );
}
