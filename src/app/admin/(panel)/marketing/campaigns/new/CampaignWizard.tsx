"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Field, TextInput, Textarea, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { applyContent } from "@/lib/email/content";
import { renderProductCards } from "@/lib/email/product-cards";
import { VariablesButton } from "../../_components/VariablesButton";
import { createCampaign, testCampaign } from "../actions";

export type WizardSegment = { slug: string; label: string; size: number };
export type WizardTemplate = { slug: string; name: string; subject: string; html: string; thumbnail: string | null; header: string };

const SITE = "https://phonetrade31.ru";
const IMP = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/imported/";
const SAMPLE_PRODUCTS = renderProductCards([
  { image: IMP + "iphone-17-pro-max-1tb-orange-1tb.jpg", title: "iPhone 17 Pro Max 1TB Orange", priceCash: 132000, priceCard: 152000, url: "/product/iphone-17-pro-max-1tb-orange-1tb" },
  { image: IMP + "iphone-17-pro-1tb-orange-1tb.jpg", title: "iPhone 17 Pro 1TB Orange", priceCash: 130000, priceCard: 149000, url: "/product/iphone-17-pro-1tb-orange-1tb" },
  { image: IMP + "iphone-17-pro-max-256gb-orange-dual-sim-256gb.jpg", title: "iPhone 17 Pro Max 256GB Orange", priceCash: 108000, priceCard: 125000, url: "/product/iphone-17-pro-max-256gb-orange-dual-sim-256gb" },
  { image: IMP + "iphone-17-pro-512gb-orange-512gb.jpg", title: "iPhone 17 Pro 512GB Orange", priceCash: 107000, priceCard: 124000, url: "/product/iphone-17-pro-512gb-orange-512gb" },
]);

function render(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), vars);
    return v == null ? "" : String(v);
  });
}

const STEPS = ["Кому", "Что", "Когда"];
type Ov = { heading: string; body: string; cta_text: string; cta_url: string; header_image: string };

export function CampaignWizard({ segments, templates }: { segments: WizardSegment[]; templates: WizardTemplate[] }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [segmentSlug, setSegmentSlug] = React.useState(segments[0]?.slug ?? "all");
  const [templateSlug, setTemplateSlug] = React.useState(templates[0]?.slug ?? "");
  const [subject, setSubject] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const [ov, setOv] = React.useState<Ov>({ heading: "", body: "", cta_text: "Смотреть", cta_url: "/catalog", header_image: "" });
  const [mode, setMode] = React.useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [testEmail, setTestEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const segment = segments.find((s) => s.slug === segmentSlug);
  const template = templates.find((t) => t.slug === templateSlug);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const set = (k: keyof Ov, v: string) => setOv((p) => ({ ...p, [k]: v }));

  const overrides = (): Record<string, string> => {
    const o: Record<string, string> = {};
    if (ov.heading.trim()) o.heading = ov.heading;
    if (ov.body.trim()) o.body = ov.body;
    if (ov.cta_text.trim()) o.cta_text = ov.cta_text;
    if (ov.cta_url.trim()) o.cta_url = ov.cta_url;
    if (ov.header_image.trim()) o.header_image = ov.header_image;
    return o;
  };
  const input = () => ({
    name, segmentSlug, templateSlug,
    subjectOverride: subject || undefined, previewOverride: preview || undefined,
    overrides: overrides(),
    mode, scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : null,
  });

  const previewHtml = React.useMemo(() => {
    if (!template) return "";
    const content = {
      heading: ov.heading || "Заголовок кампании",
      body: ov.body || "Текст письма появится здесь.",
      cta_text: ov.cta_text || "Смотреть",
      cta_url: ov.cta_url || "/catalog",
      header_image: ov.header_image || template.header,
    };
    return render(applyContent(template.html, content), { products: SAMPLE_PRODUCTS, customer: { first_name: "Денис" }, unsubscribe_url: `${SITE}/unsubscribe?token=demo` });
  }, [template, ov]);

  const canNext = step === 0 ? !!name.trim() && !!segment : step === 1 ? !!templateSlug && !!ov.heading.trim() : true;

  const test = async () => {
    if (!testEmail.trim()) return;
    setSending(true);
    const res = await testCampaign({ ...input(), email: testEmail.trim() });
    setSending(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Тестовое письмо отправлено");
  };
  const submit = async () => {
    if (mode === "schedule" && !scheduledAt) { toast.error("Укажите дату и время отправки"); return; }
    setSubmitting(true);
    const res = await createCampaign(input());
    setSubmitting(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(mode === "schedule" ? "Кампания запланирована" : `Отправлено: ${res.sent ?? 0}${res.failed ? `, ошибок: ${res.failed}` : ""}`);
    router.push("/admin/marketing/campaigns");
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-5 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn("flex items-center gap-2 text-[13px]", i === step ? "font-semibold text-ink" : "text-ink-subtle")}>
                <span className={cn("flex size-6 items-center justify-center rounded-full text-[12px]", i <= step ? "bg-ink text-white" : "bg-surface text-ink-subtle")}>{i + 1}</span>{s}
              </div>
              {i < STEPS.length - 1 ? <div className="h-px flex-1 bg-border" /> : null}
            </React.Fragment>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <Field label="Название кампании" hint="Внутреннее, для вас"><TextInput value={name} placeholder="iPhone 17 в наличии" onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Сегмент получателей">
              <div className="space-y-2">
                {segments.map((s) => (
                  <label key={s.slug} className={cn("flex cursor-pointer items-center justify-between rounded-xl border px-4 py-2.5", segmentSlug === s.slug ? "border-ink bg-surface" : "border-border")}>
                    <span className="flex items-center gap-2.5 text-[14px] text-ink"><input type="radio" name="seg" checked={segmentSlug === s.slug} onChange={() => setSegmentSlug(s.slug)} className="size-4 accent-[var(--color-ink)]" />{s.label}</span>
                    <span className="text-[13px] text-ink-muted">{s.size} чел.</span>
                  </label>
                ))}
              </div>
            </Field>
            {segment ? <p className="text-[13px] text-ink-muted">Будет отправлено: <b className="text-ink">{segment.size}</b> писем</p> : null}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Шаблон">
              <div className="grid grid-cols-3 gap-2">
                {templates.map((t) => (
                  <button key={t.slug} type="button" onClick={() => setTemplateSlug(t.slug)} className={cn("rounded-xl border p-2 text-left", templateSlug === t.slug ? "border-ink" : "border-border")}>
                    {t.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.thumbnail} alt="" className="mb-1.5 aspect-[16/9] w-full rounded-md object-cover" />
                    ) : null}
                    <span className="block truncate text-[12px] font-medium text-ink">{t.name}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Тема письма"><TextInput value={subject} placeholder={template?.subject} onChange={(e) => setSubject(e.target.value)} /></Field>
            <Field label="Превью-текст"><TextInput value={preview} onChange={(e) => setPreview(e.target.value)} /></Field>
            <Field label="Заголовок"><TextInput value={ov.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
            <Field label="Текст" hint="Каждая строка — абзац">
              <Textarea ref={bodyRef} rows={3} value={ov.body} onChange={(e) => set("body", e.target.value)} />
              <div className="mt-1.5">
                <VariablesButton targetRef={bodyRef} value={ov.body} onChange={(v) => set("body", v)} scope="campaign" />
              </div>
            </Field>
            <Field label="Картинка-хедер" hint="Пусто → баннер шаблона. Загрузите файл или вставьте ссылку">
              <ImageField value={ov.header_image || null} onChange={(url) => set("header_image", url ?? "")} bucket="product-images" folder="email/headers" aspect="wide" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Кнопка — текст"><TextInput value={ov.cta_text} onChange={(e) => set("cta_text", e.target.value)} /></Field>
              <Field label="Кнопка — ссылка"><TextInput value={ov.cta_url} onChange={(e) => set("cta_url", e.target.value)} /></Field>
            </div>
            <p className="text-[12px] text-ink-muted">Витрина товаров (актуальные iPhone) добавляется автоматически.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[14px]", mode === "now" ? "border-ink bg-surface" : "border-border")}>
                <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} className="size-4 accent-[var(--color-ink)]" /> Отправить сейчас
              </label>
              <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[14px]", mode === "schedule" ? "border-ink bg-surface" : "border-border")}>
                <input type="radio" checked={mode === "schedule"} onChange={() => setMode("schedule")} className="size-4 accent-[var(--color-ink)]" /> Запланировать
              </label>
              {mode === "schedule" ? <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[14px]" /> : null}
            </div>
            <div className="rounded-xl border border-border/60 bg-surface/40 p-3 text-[13px] text-ink-muted">
              Сегмент: <b className="text-ink">{segment?.label}</b> ({segment?.size} чел.) · Тема: «{subject || template?.subject}»
            </div>
            <Field label="Тест на свой email">
              <div className="flex gap-2">
                <TextInput type="email" placeholder="you@mail.ru" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                <AdminButton variant="outline" onClick={test} loading={sending} disabled={!testEmail.trim()}>Тест</AdminButton>
              </div>
            </Field>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <AdminButton variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Назад</AdminButton>
          {step < 2 ? (
            <AdminButton onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Далее</AdminButton>
          ) : (
            <AdminButton onClick={submit} loading={submitting}>{mode === "schedule" ? "Запланировать" : `Отправить (${segment?.size ?? 0})`}</AdminButton>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface p-3">
        <iframe title="Превью" srcDoc={previewHtml} className="block h-[680px] w-full rounded-lg border border-border/60 bg-white" />
      </div>
    </div>
  );
}
