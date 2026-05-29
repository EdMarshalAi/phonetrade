"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { AdminButton } from "@/components/admin/form";
import { setLeadStatus, updateLeadNotes } from "./actions";

const STATUS_OPTIONS = [
  { value: "new", label: "Новая" },
  { value: "in_progress", label: "В работе" },
  { value: "converted", label: "Конвертирована" },
  { value: "rejected", label: "Отказ" },
];

export function LeadStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [current, setCurrent] = React.useState(status);

  const change = (value: string) => {
    if (value === current) return;
    start(async () => {
      const res = await setLeadStatus(id, value);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setCurrent(value);
      toast.success("Статус обновлён");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_OPTIONS.map((s) => (
        <button
          key={s.value}
          type="button"
          disabled={pending}
          onClick={() => change(s.value)}
          className={cn(
            "h-8 rounded-sm border px-3 text-[13px] transition-colors disabled:opacity-60",
            current === s.value ? "border-transparent bg-ink text-white" : "border-border bg-white text-ink hover:bg-surface"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function LeadNotes({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      const res = await updateLeadNotes(id, value);
      if (res.error) toast.error(res.error);
      else toast.success("Заметка сохранена");
    });
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Внутренние заметки менеджера…"
        className="min-h-[96px] w-full rounded-sm border border-border bg-white px-3 py-2 text-[14px] leading-relaxed text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
      />
      <AdminButton type="button" size="sm" variant="outline" onClick={save} loading={pending}>
        Сохранить заметку
      </AdminButton>
    </div>
  );
}
