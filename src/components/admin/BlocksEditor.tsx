"use client";

import * as React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { Field, TextInput, Textarea, AdminButton } from "@/components/admin/form";
import { IconPicker } from "@/components/admin/IconPicker";
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

/** Редактор списка инфоблоков (иконка + заголовок + текст + опц. ссылка). */
export function BlocksEditor({
  value,
  onChange,
  withHref = false,
}: {
  value: InfoBlock[];
  onChange: (next: InfoBlock[]) => void;
  withHref?: boolean;
}) {
  const patch = (i: number, p: Partial<InfoBlock>) =>
    onChange(value.map((b, idx) => (idx === i ? { ...b, ...p } : b)));

  return (
    <div className="space-y-4">
      {value.map((b, i) => (
        <Panel key={i} className="space-y-3 p-5">
          <div className="flex items-start gap-3">
            <div className="pt-6">
              <IconPicker value={b.icon ?? null} onChange={(name) => patch(i, { icon: name })} />
            </div>
            <div className="flex-1 space-y-3">
              <Field label="Заголовок">
                <TextInput value={b.title} onChange={(e) => patch(i, { title: e.target.value })} />
              </Field>
              <Field label="Текст">
                <Textarea value={b.text} onChange={(e) => patch(i, { text: e.target.value })} className="min-h-[56px]" />
              </Field>
              {withHref ? (
                <Field label="Ссылка (необязательно)" hint="Если задана — блок становится кликабельным">
                  <TextInput value={b.href ?? ""} onChange={(e) => patch(i, { href: e.target.value || undefined })} placeholder="/trade-in" />
                </Field>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5 pt-6">
              <button type="button" onClick={() => onChange(move(value, i, -1))} className={iconBtn} title="Выше">
                <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => onChange(move(value, i, 1))} className={iconBtn} title="Ниже">
                <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className={cn(iconBtn, "text-sale hover:bg-sale/5")}
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </Panel>
      ))}
      <AdminButton
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { icon: null, title: "Новый блок", text: "" }])}
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Добавить блок
      </AdminButton>
    </div>
  );
}
