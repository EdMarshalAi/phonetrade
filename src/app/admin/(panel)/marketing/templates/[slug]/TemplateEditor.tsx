"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Monitor, Smartphone } from "lucide-react";
import { Field, TextInput, Textarea, Switch, AdminButton } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/ui";
import { updateTemplate, testSendTemplate } from "../../actions";

const SITE = "https://phonetrade31.ru";
const SAMPLE: Record<string, unknown> = {
  customer: { first_name: "Денис", name: "Денис Астахов" },
  order: { number: "PT-2026-0042", total: "96 000 ₽", payment: "Картой", delivery: "Самовывоз (ул. Попова, 36)", status: "В пути", tracking_number: "CDEK-1234567", tracking_url: SITE, items: '<div style="padding:8px 0;border-bottom:1px solid #e5e5ea;font-size:14px;">iPhone 17 256GB Black × 1 — 72 000 ₽</div>' },
  cart: { total: "72 000 ₽", url: `${SITE}/cart`, items: '<div style="padding:8px 0;border-bottom:1px solid #e5e5ea;font-size:14px;">iPhone 17 256GB Black × 1 — 72 000 ₽</div>' },
  promo: { code: "DEMO1000" },
  campaign: { subject: "iPhone 17 в наличии", preview: "Только привезли", hero_image: `${SITE}/opengraph-image`, title: "iPhone 17 Pro Max в новом цвете", body: "Cosmic Orange уже на витрине.", cta_text: "Смотреть", cta_url: `${SITE}/category/iphone` },
  unsubscribe_url: `${SITE}/unsubscribe?token=demo`,
};

function render(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), vars);
    return v == null ? "" : String(v);
  });
}

type Tpl = { slug: string; name: string; category: string; subject: string; previewText: string; html: string; variables: string[]; isActive: boolean };

export function TemplateEditor({ template }: { template: Tpl }) {
  const router = useRouter();
  const [subject, setSubject] = React.useState(template.subject);
  const [previewText, setPreviewText] = React.useState(template.previewText);
  const [html, setHtml] = React.useState(template.html);
  const [isActive, setIsActive] = React.useState(template.isActive);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const preview = React.useMemo(() => render(html, SAMPLE), [html]);

  const save = async () => {
    setSaving(true);
    const res = await updateTemplate(template.slug, { subject, preview_text: previewText, html_content: html, is_active: isActive });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Шаблон сохранён");
    router.refresh();
  };
  const test = async () => {
    if (!testEmail.trim()) return;
    setSending(true);
    const res = await testSendTemplate(template.slug, testEmail.trim());
    setSending(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Тестовое письмо отправлено");
  };

  return (
    <>
      <PageHeader
        title={template.name}
        description={`Шаблон: ${template.slug}`}
        actions={
          <Link href="/admin/marketing/templates" className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-white px-3 text-[14px] font-medium text-ink hover:bg-surface">
            <ChevronLeft className="size-4" /> К шаблонам
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* редактор */}
        <div className="space-y-4">
          <Switch checked={isActive} onChange={setIsActive} label="Активен" />
          <Field label="Тема письма">
            <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Превью-текст" hint="Виден в почтовике под темой (50–90 символов)">
            <TextInput value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
          </Field>
          <Field label="HTML письма" hint="Inline-стили. Доступные переменные — ниже.">
            <Textarea rows={14} className="font-mono text-[12px]" value={html} onChange={(e) => setHtml(e.target.value)} />
          </Field>
          {template.variables.length ? (
            <div className="rounded-xl border border-border/60 bg-surface/40 p-3">
              <p className="mb-1.5 text-[12px] font-medium text-ink">Переменные</p>
              <div className="flex flex-wrap gap-1.5">
                {template.variables.map((v) => (
                  <code key={v} className="rounded bg-white px-1.5 py-0.5 text-[11.5px] text-ink-muted">{`{{${v}}}`}</code>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AdminButton onClick={save} loading={saving}>Сохранить</AdminButton>
            <TextInput type="email" placeholder="email для теста" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="h-10 max-w-[200px]" />
            <AdminButton variant="outline" onClick={test} loading={sending} disabled={!testEmail.trim()}>Тест</AdminButton>
          </div>
        </div>

        {/* превью */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <button type="button" onClick={() => setDevice("desktop")} className={device === "desktop" ? "inline-flex items-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 text-[13px] font-medium text-white" : "inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink-muted"}><Monitor className="size-4" /> Десктоп</button>
            <button type="button" onClick={() => setDevice("mobile")} className={device === "mobile" ? "inline-flex items-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 text-[13px] font-medium text-white" : "inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink-muted"}><Smartphone className="size-4" /> Мобайл</button>
          </div>
          <p className="mb-2 text-[12px] text-ink-muted">
            Превью с <b>тестовыми данными</b> (Денис Астахов, заказ PT-2026-0042). Переменные <code className="rounded bg-surface px-1">{`{{…}}`}</code> подставляются реальными значениями при отправке.
          </p>
          <div className="rounded-2xl border border-border/60 bg-surface p-3">
            <iframe title="Превью письма" srcDoc={preview} className="mx-auto block h-[640px] w-full rounded-lg border border-border/60 bg-white" style={{ maxWidth: device === "mobile" ? 380 : "100%" }} />
          </div>
        </div>
      </div>
    </>
  );
}
