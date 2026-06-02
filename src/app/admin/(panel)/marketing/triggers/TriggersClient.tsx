"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Switch, TextInput, AdminButton } from "@/components/admin/form";
import { StatusBadge } from "@/components/admin/ui";
import { toggleTrigger, testSendTemplate } from "../actions";

export type TriggerRow = {
  slug: string; name: string; description: string | null;
  isActive: boolean; delay: string; templateSlug: string | null; category: string | null;
};

const CAT_LABEL: Record<string, string> = { transactional: "Транзакционное", marketing: "Маркетинг", trigger: "Триггер" };

export function TriggersClient({ rows }: { rows: TriggerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [testFor, setTestFor] = React.useState<string | null>(null);
  const [testEmail, setTestEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const onToggle = async (slug: string, next: boolean) => {
    setBusy(slug);
    const res = await toggleTrigger(slug, next);
    setBusy(null);
    if (res.error) { toast.error(res.error); return; }
    toast.success(next ? "Триггер включён" : "Триггер выключен");
    router.refresh();
  };

  const onTest = async (templateSlug: string) => {
    if (!testEmail.trim()) return;
    setSending(true);
    const res = await testSendTemplate(templateSlug, testEmail.trim());
    setSending(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Тестовое письмо отправлено");
    setTestFor(null); setTestEmail("");
  };

  return (
    <div className="space-y-3">
      {rows.map((t) => (
        <div key={t.slug} className="rounded-2xl border border-border/60 bg-white p-4 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[14.5px] font-semibold text-ink">{t.name}</h3>
                {t.category ? <StatusBadge>{CAT_LABEL[t.category] ?? t.category}</StatusBadge> : null}
                <span className="shrink-0 text-[12px] text-ink-subtle">· {t.delay}</span>
              </div>
              {t.description ? <p className="mt-0.5 text-[12.5px] text-ink-muted">{t.description}</p> : null}
            </div>
            {busy === t.slug ? <Loader2 className="size-4 shrink-0 animate-spin text-ink-subtle" /> : <Switch checked={t.isActive} onChange={(v) => onToggle(t.slug, v)} />}
          </div>

          <div className="mt-3 flex items-center gap-2">
            {testFor === t.slug ? (
              <>
                <TextInput type="email" placeholder="email для теста" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="h-9 max-w-[240px]" />
                <AdminButton size="sm" onClick={() => t.templateSlug && onTest(t.templateSlug)} loading={sending} disabled={!testEmail.trim() || !t.templateSlug}>Отправить</AdminButton>
                <AdminButton size="sm" variant="ghost" onClick={() => { setTestFor(null); setTestEmail(""); }}>Отмена</AdminButton>
              </>
            ) : (
              <AdminButton size="sm" variant="outline" onClick={() => setTestFor(t.slug)} disabled={!t.templateSlug}>
                <Send className="size-3.5" /> Тест на email
              </AdminButton>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
