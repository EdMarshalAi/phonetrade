"use client";

import * as React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { Field, TextInput, Textarea, AdminButton } from "@/components/admin/form";
import { Modal } from "@/components/admin/Modal";
import { IconPicker } from "@/components/admin/IconPicker";
import { resolveIcon } from "@/lib/admin/icons";
import type { InfoBlock } from "@/lib/content";

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-white text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40";

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Редактор инфоблоков — единый паттерн «строка + модалка», как в опциях/корзине. */
export function BlocksEditor({
  value,
  onChange,
  withHref = false,
  onDone,
  saving = false,
}: {
  value: InfoBlock[];
  onChange: (next: InfoBlock[]) => void;
  withHref?: boolean;
  /** Если задан — кнопка в модалке закрывает и сохраняет (без повторного «Сохранить»). */
  onDone?: () => void;
  saving?: boolean;
}) {
  const [edit, setEdit] = React.useState<number | null>(null);
  const patch = (i: number, p: Partial<InfoBlock>) =>
    onChange(value.map((b, idx) => (idx === i ? { ...b, ...p } : b)));

  return (
    <>
      <Panel className="divide-y divide-border/60">
        {value.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-ink-muted">Блоков пока нет.</p>
        ) : (
          value.map((b, i) => {
            const Icon = b.icon ? resolveIcon(b.icon) : null;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-ink">
                  {Icon ? <Icon className="size-[18px]" strokeWidth={1.75} /> : null}
                </span>
                <button type="button" onClick={() => setEdit(i)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[14px] font-medium text-ink">{b.title || "Блок"}</span>
                  <span className="block truncate text-[12px] text-ink-subtle">{b.text || "—"}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setEdit(i)} className={iconBtn} title="Изменить"><Pencil className="h-4 w-4" strokeWidth={1.75} /></button>
                  <button type="button" onClick={() => onChange(move(value, i, -1))} className={iconBtn} title="Выше"><ArrowUp className="h-4 w-4" strokeWidth={1.75} /></button>
                  <button type="button" onClick={() => onChange(move(value, i, 1))} className={iconBtn} title="Ниже"><ArrowDown className="h-4 w-4" strokeWidth={1.75} /></button>
                  <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className={cn(iconBtn, "text-sale hover:bg-sale/5")} title="Удалить"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
                </div>
              </div>
            );
          })
        )}
        <div className="px-4 py-3">
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setEdit(value.length); onChange([...value, { icon: null, title: "Новый блок", text: "" }]); }}
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Добавить блок
          </AdminButton>
        </div>
      </Panel>

      <Modal
        open={edit !== null}
        onClose={() => setEdit(null)}
        title="Блок"
        footer={
          <AdminButton
            type="button"
            loading={saving}
            onClick={() => { setEdit(null); onDone?.(); }}
          >
            {onDone ? "Готово и сохранить" : "Готово"}
          </AdminButton>
        }
      >
        {edit !== null && value[edit] ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Field label="Иконка">
                <IconPicker value={value[edit].icon ?? null} onChange={(name) => patch(edit, { icon: name })} />
              </Field>
              <Field label="Заголовок" className="flex-1">
                <TextInput value={value[edit].title} onChange={(e) => patch(edit, { title: e.target.value })} />
              </Field>
            </div>
            <Field label="Текст">
              <Textarea value={value[edit].text} onChange={(e) => patch(edit, { text: e.target.value })} className="min-h-[72px]" />
            </Field>
            {withHref ? (
              <Field label="Ссылка (необязательно)" hint="Если задана — блок становится кликабельным и выделяется">
                <TextInput value={value[edit].href ?? ""} onChange={(e) => patch(edit, { href: e.target.value || undefined })} placeholder="/trade-in" />
              </Field>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
