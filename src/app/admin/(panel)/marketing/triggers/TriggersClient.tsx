"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Switch, TextInput, AdminButton } from "@/components/admin/form";
import { LEGAL_LABEL, legalColor } from "@/lib/email/legal";
import { toggleTrigger, testSendTemplate } from "../actions";

export type TriggerRow = {
  slug: string; name: string; description: string | null;
  isActive: boolean; delay: string; templateSlug: string | null; legalCategory: string | null;
};

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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((t) => (
        <div key={t.slug} className="flex flex-col rounded-2xl border border-border/60 bg-white p-4 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold leading-snug text-ink">{t.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-muted">
                {t.legalCategory ? (
                  <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2 rounded-full" style={{ backgroundColor: legalColor(t.legalCategory) }} />{LEGAL_LABEL[t.legalCategory] ?? t.legalCategory}</span>
                ) : null}
                <span className="text-ink-subtle">· {t.delay}</span>
              </div>
            </div>
            {busy === t.slug ? <Loader2 className="size-4 shrink-0 animate-spin text-ink-subtle" /> : <Switch checked={t.isActive} onChange={(v) => onToggle(t.slug, v)} />}
          </div>
          {t.description ? <p className="mt-2 text-[12px] leading-snug text-ink-muted">{t.description}</p> : null}

          <div className="mt-auto pt-3">
            {testFor === t.slug ? (
              <div className="space-y-2">
                <TextInput type="email" placeholder="email для теста" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="h-9" />
                <div className="flex gap-2">
                  <AdminButton size="sm" onClick={() => t.templateSlug && onTest(t.templateSlug)} loading={sending} disabled={!testEmail.trim() || !t.templateSlug}>Отправить</AdminButton>
                  <AdminButton size="sm" variant="ghost" onClick={() => { setTestFor(null); setTestEmail(""); }}>Отмена</AdminButton>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setTestFor(t.slug)} disabled={!t.templateSlug} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-50">
                <Send className="size-3.5" /> Тест на email
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
