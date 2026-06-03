"use client";

import * as React from "react";
import { Braces, Plus } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { variableGroupsForScope, type EmailVarScope } from "@/lib/email/variables";

/**
 * Кнопка «Переменные» под полем текста: открывает модалку со всем списком
 * подстановок и вставляет выбранную в позицию курсора в связанном поле
 * (targetRef). Контролируемое значение синхронизируется через onChange.
 */
export function VariablesButton({
  targetRef,
  value,
  onChange,
  scope = "template",
}: {
  targetRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  scope?: EmailVarScope;
}) {
  const [open, setOpen] = React.useState(false);
  const groups = variableGroupsForScope(scope);

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const el = targetRef.current;
    if (!el) {
      onChange(value ? `${value} ${token}` : token);
      setOpen(false);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* поле могло размонтироваться */
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-white px-2.5 text-[12px] font-medium text-ink-muted hover:bg-surface hover:text-ink"
      >
        <Braces className="size-3.5" strokeWidth={1.75} /> Переменные
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Вставить переменную" className="max-w-lg">
        <div className="space-y-5 px-5 py-4">
          <p className="text-[13px] text-ink-muted">
            Нажмите на переменную — она вставится в текст туда, где стоит курсор. В письме подставится реальное значение.
          </p>
          {groups.map((g) => (
            <div key={g.group}>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">{g.group}</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {g.vars.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insert(v.key)}
                    className="group flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left hover:border-ink hover:bg-surface"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{v.label}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-subtle">{`{{${v.key}}}`}</span>
                    </span>
                    <Plus className="size-4 shrink-0 text-ink-subtle group-hover:text-ink" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
