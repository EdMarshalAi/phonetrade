"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/form";
import { setDataRequestStatus } from "./actions";

export function DataRequestActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [response, setResponse] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const run = (next: string, resp?: string) => {
    setPending(next);
    setError(null);
    setDataRequestStatus(id, next, resp)
      .then((r) => {
        setPending(null);
        if (r.error) {
          setError(r.error);
          return;
        }
        setOpen(false);
        router.refresh();
      })
      .catch(() => {
        setPending(null);
        setError("Ошибка соединения");
      });
  };

  const isClosed = status === "done" || status === "rejected";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-2">
        {status === "new" && (
          <AdminButton variant="outline" size="sm" loading={pending === "in_progress"} onClick={() => run("in_progress")}>
            В работу
          </AdminButton>
        )}
        {!isClosed && (
          <AdminButton variant="primary" size="sm" onClick={() => setOpen((o) => !o)}>
            Закрыть…
          </AdminButton>
        )}
        {isClosed && (
          <AdminButton variant="ghost" size="sm" loading={pending === "in_progress"} onClick={() => run("in_progress")}>
            Вернуть в работу
          </AdminButton>
        )}
      </div>

      {open && !isClosed && (
        <div className="w-72 rounded-md border border-border bg-white p-3 text-left shadow-sm">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
            placeholder="Ответ заявителю / отметка о выполнении (необязательно)"
            className="w-full rounded-sm border border-border bg-surface px-2.5 py-2 text-[13px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 resize-y"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <AdminButton variant="danger" size="sm" loading={pending === "rejected"} onClick={() => run("rejected", response)}>
              Отклонить
            </AdminButton>
            <AdminButton variant="primary" size="sm" loading={pending === "done"} onClick={() => run("done", response)}>
              Выполнено
            </AdminButton>
          </div>
        </div>
      )}

      {error && <p className="text-[12px] text-sale">{error}</p>}
    </div>
  );
}
