"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Select } from "@/components/admin/form";
import { updateProductStatus } from "./actions";

const STATUS_OPTIONS = [
  { value: "published", label: "Опубликован" },
  { value: "draft", label: "Черновик" },
  { value: "archived", label: "Архив" },
];

// Цвет триггера по статусу: опубликован — акцент, остальные приглушены (скрыты с сайта).
const STATUS_CLASS: Record<string, string> = {
  published: "text-ink font-medium",
  draft: "text-ink-muted",
  archived: "text-ink-subtle",
};

/** Inline-смена статуса товара прямо в таблице (список товаров и прайс). */
export function ProductStatusSelect({ id, status, className }: { id: string; status: string; className?: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(status);
  const [busy, setBusy] = React.useState(false);
  // синхронизация со свежим prop (после router.refresh) — без эффекта, по паттерну React
  const [prevStatus, setPrevStatus] = React.useState(status);
  if (status !== prevStatus) { setPrevStatus(status); setValue(status); }

  const onChange = async (next: string) => {
    if (next === value) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await updateProductStatus(id, next);
    setBusy(false);
    if (res.error) {
      setValue(prev);
      toast.error(res.error);
      return;
    }
    toast.success(next === "published" ? "Опубликован на сайте" : "Скрыт с сайта");
    router.refresh();
  };

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={busy}
      className={cn("h-8 w-full min-w-[7.5rem]", STATUS_CLASS[value], className)}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </Select>
  );
}
