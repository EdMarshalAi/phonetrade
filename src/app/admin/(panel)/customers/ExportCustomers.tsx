"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Loader2, Check, Users, UserCheck, Mail } from "lucide-react";
import { AdminButton } from "@/components/admin/form";
import { cn } from "@/lib/utils/cn";
import { exportCustomers, type ExportScope } from "./actions";

const OPTIONS: { value: ExportScope; label: string; hint: string; icon: typeof Users }[] = [
  { value: "all", label: "Все клиенты", hint: "Полная база — все, кто оставил номер", icon: Users },
  { value: "registered", label: "С личным кабинетом", hint: "Только зарегистрированные на сайте", icon: UserCheck },
  { value: "marketing", label: "Согласие на рассылку", hint: "Только давшие согласие на маркетинг", icon: Mail },
];

export function ExportCustomers() {
  const [open, setOpen] = React.useState(false);
  const [scope, setScope] = React.useState<ExportScope>("all");
  const [pending, start] = React.useTransition();

  const run = () =>
    start(async () => {
      const res = await exportCustomers(scope);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Выгружено клиентов: ${res.count}`);
      setOpen(false);
    });

  return (
    <>
      <AdminButton type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" strokeWidth={1.75} /> Экспорт
      </AdminButton>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => !pending && setOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-border/70 bg-white p-5 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink">
                <Download className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">Экспорт клиентов</p>
                <p className="text-[13px] text-ink-muted">Выберите, кого выгрузить в CSV</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {OPTIONS.map((o) => {
                const active = scope === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setScope(o.value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      active ? "border-ink bg-ink/[0.03]" : "border-border hover:border-ink/30 hover:bg-surface/50"
                    )}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", active ? "bg-ink text-white" : "bg-surface text-ink-muted")}>
                      <o.icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink">{o.label}</span>
                      <span className="block text-[12.5px] text-ink-muted">{o.hint}</span>
                    </span>
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", active ? "border-ink bg-ink text-white" : "border-border")}>
                      {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="h-9 rounded-sm border border-border bg-white px-3.5 text-[13.5px] text-ink hover:bg-surface disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={run}
                disabled={pending}
                className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3.5 text-[13.5px] font-medium text-white hover:bg-ink/90 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Выгрузить CSV
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
