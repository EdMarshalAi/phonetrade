"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Кнопка удаления с подтверждением (модалка). Принимает серверный экшен,
 * предварительно привязанный к id (через .bind). Undo-семантику для
 * критичных сущностей даёт soft-delete на стороне экшена.
 */
export function DeleteButton({
  action,
  itemName,
  label = "Удалить",
  iconOnly,
  redirectTo,
}: {
  action: () => Promise<{ error?: string } | void>;
  itemName: string;
  label?: string;
  iconOnly?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  const confirm = () => {
    start(async () => {
      const res = await action();
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Удалено: ${itemName}`);
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-sm border border-border bg-white text-ink-muted transition-colors hover:border-sale/40 hover:text-sale",
          iconOnly ? "h-8 w-8" : "h-8 px-3 text-[13px]"
        )}
        aria-label={iconOnly ? `${label}: ${itemName}` : undefined}
        title={iconOnly ? `${label}` : undefined}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        {!iconOnly ? label : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => !pending && setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-md border border-border/70 bg-white p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sale/10">
                <AlertTriangle className="h-4.5 w-4.5 text-sale" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">Удалить?</p>
                <p className="mt-1 text-[13.5px] text-ink-muted">
                  «{itemName}» будет удалён. Действие подтвердите ниже.
                </p>
              </div>
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
                onClick={confirm}
                disabled={pending}
                className="inline-flex h-9 items-center gap-2 rounded-sm bg-sale px-3.5 text-[13.5px] font-medium text-white hover:bg-sale/90 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Удалить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
