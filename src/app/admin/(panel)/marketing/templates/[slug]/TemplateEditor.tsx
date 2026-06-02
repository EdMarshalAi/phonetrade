"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Monitor, Smartphone } from "lucide-react";
import { Field, TextInput, Textarea, Switch, AdminButton } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/ui";
import { applyContent } from "@/lib/email/content";
import { renderProductCards, renderItemRows } from "@/lib/email/product-cards";
import { LEGAL_LABEL, LEGAL_HINT, LEGAL_WARNING, legalColor, type LegalCategory } from "@/lib/email/legal";
import { updateTemplate, testSendTemplate } from "../../actions";

const SITE = "https://phonetrade31.ru";
const IMP = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/imported/";
const SAMPLE_PRODUCTS = renderProductCards([
  { image: IMP + "iphone-17-pro-max-1tb-orange-1tb.jpg", title: "iPhone 17 Pro Max 1TB Orange", priceCash: 132000, priceCard: 152000, url: "/product/iphone-17-pro-max-1tb-orange-1tb" },
  { image: IMP + "iphone-17-pro-1tb-orange-1tb.jpg", title: "iPhone 17 Pro 1TB Orange", priceCash: 130000, priceCard: 149000, url: "/product/iphone-17-pro-1tb-orange-1tb" },
  { image: IMP + "iphone-17-pro-max-256gb-orange-dual-sim-256gb.jpg", title: "iPhone 17 Pro Max 256GB Orange", priceCash: 108000, priceCard: 125000, url: "/product/iphone-17-pro-max-256gb-orange-dual-sim-256gb" },
  { image: IMP + "iphone-17-pro-512gb-orange-512gb.jpg", title: "iPhone 17 Pro 512GB Orange", priceCash: 107000, priceCard: 124000, url: "/product/iphone-17-pro-512gb-orange-512gb" },
]);
const SAMPLE_ITEMS = renderItemRows([{ image: IMP + "iphone-17-pro-max-256gb-orange-dual-sim-256gb.jpg", title: "iPhone 17 Pro Max 256GB Orange", qty: 1, price: 108000 }]);
const SAMPLE: Record<string, unknown> = {
  customer: { first_name: "Денис", name: "Денис Астахов" },
  order: { number: "PT-2026-0042", total: "108 000 ₽", payment: "Картой", delivery: "Самовывоз (ул. Попова, 36)", status: "В пути", tracking_number: "CDEK-1234567", tracking_url: SITE, items: SAMPLE_ITEMS },
  cart: { total: "108 000 ₽", url: `${SITE}/cart`, items: SAMPLE_ITEMS },
  promo: { code: "DEMO1000" },
  products: SAMPLE_PRODUCTS,
  unsubscribe_url: `${SITE}/unsubscribe?token=demo`,
};

function render(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), vars);
    return v == null ? "" : String(v);
  });
}

type C = { heading: string; body: string; cta_text: string; cta_url: string; header_image: string };
type Tpl = { slug: string; name: string; category: string; legalCategory: string; subject: string; previewText: string; html: string; isActive: boolean; content: C };

export function TemplateEditor({ template }: { template: Tpl }) {
  const router = useRouter();
  const [subject, setSubject] = React.useState(template.subject);
  const [previewText, setPreviewText] = React.useState(template.previewText);
  const [c, setC] = React.useState<C>(template.content);
  const [legal, setLegal] = React.useState<LegalCategory>(template.legalCategory as LegalCategory);
  const [isActive, setIsActive] = React.useState(template.isActive);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const set = (k: keyof C, v: string) => setC((p) => ({ ...p, [k]: v }));

  const preview = React.useMemo(() => render(applyContent(template.html, c), { ...SAMPLE, c }), [template.html, c]);

  const save = async () => {
    setSaving(true);
    const res = await updateTemplate(template.slug, { subject, preview_text: previewText, content: c, is_active: isActive, legal_category: legal });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Шаблон сохранён");
    router.refresh();
  };
  const test = async () => {
    if (!testEmail.trim()) return;
    setSending(true);
    // сохраняем перед тестом, чтобы письмо ушло с текущими правками
    await updateTemplate(template.slug, { subject, preview_text: previewText, content: c, is_active: isActive, legal_category: legal });
    const res = await testSendTemplate(template.slug, testEmail.trim());
    setSending(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Тестовое письмо отправлено");
  };

  const isCampaign = template.category === "marketing";

  return (
    <>
      <PageHeader
        title={template.name}
        description={isCampaign ? "Кампанийный шаблон — заголовок и текст обычно задаются при создании кампании" : `Шаблон: ${template.slug}`}
        actions={
          <Link href="/admin/marketing/templates" className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-white px-3 text-[14px] font-medium text-ink hover:bg-surface">
            <ChevronLeft className="size-4" /> К шаблонам
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Switch checked={isActive} onChange={setIsActive} label="Активен" />
          <Field label="Тема письма"><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field label="Превью-текст" hint="Виден в почтовике под темой"><TextInput value={previewText} onChange={(e) => setPreviewText(e.target.value)} /></Field>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink">Юридическая категория</p>
            <div className="space-y-1.5">
              {(["transactional", "service", "marketing"] as LegalCategory[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2 text-[13px] has-[:checked]:border-ink has-[:checked]:bg-surface">
                  <input type="radio" name="legal" checked={legal === k} onChange={() => setLegal(k)} className="mt-0.5 size-4 accent-[var(--color-ink)]" />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-ink"><span className="inline-block size-2 rounded-full" style={{ backgroundColor: legalColor(k) }} />{LEGAL_LABEL[k]}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{LEGAL_HINT[k]}</span>
                  </span>
                </label>
              ))}
            </div>
            {legal !== template.legalCategory ? (
              <p className="mt-2 rounded-lg border border-sale/25 bg-sale/5 px-3 py-2 text-[12px] leading-snug text-sale">{LEGAL_WARNING}</p>
            ) : null}
          </div>

          <div className="h-px bg-border/60" />
          <Field label="Заголовок"><TextInput value={c.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
          <Field label="Текст" hint="Каждая строка — отдельный абзац. {{customer.first_name}} подставит имя."><Textarea rows={5} value={c.body} onChange={(e) => set("body", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Кнопка — текст"><TextInput value={c.cta_text} onChange={(e) => set("cta_text", e.target.value)} /></Field>
            <Field label="Кнопка — ссылка"><TextInput value={c.cta_url} onChange={(e) => set("cta_url", e.target.value)} /></Field>
          </div>
          <Field label="Картинка-хедер (URL)" hint="Баннер 16:9 сверху письма">
            <TextInput value={c.header_image} onChange={(e) => set("header_image", e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AdminButton onClick={save} loading={saving}>Сохранить</AdminButton>
            <TextInput type="email" placeholder="email для теста" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="h-10 max-w-[200px]" />
            <AdminButton variant="outline" onClick={test} loading={sending} disabled={!testEmail.trim()}>Тест</AdminButton>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <button type="button" onClick={() => setDevice("desktop")} className={device === "desktop" ? "inline-flex items-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 text-[13px] font-medium text-white" : "inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink-muted"}><Monitor className="size-4" /> Десктоп</button>
            <button type="button" onClick={() => setDevice("mobile")} className={device === "mobile" ? "inline-flex items-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 text-[13px] font-medium text-white" : "inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink-muted"}><Smartphone className="size-4" /> Мобайл</button>
          </div>
          <p className="mb-2 text-[12px] text-ink-muted">Превью с тестовыми данными и реальными товарами из каталога.</p>
          <div className="rounded-2xl border border-border/60 bg-surface p-3">
            <iframe title="Превью письма" srcDoc={preview} className="mx-auto block h-[680px] w-full rounded-lg border border-border/60 bg-white" style={{ maxWidth: device === "mobile" ? 380 : "100%" }} />
          </div>
        </div>
      </div>
    </>
  );
}
