"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, Upload, Star, ImageOff, Pencil, Check, X, Link2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { Field, TextInput, AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { uploadImage, uploadImageFromUrl } from "@/lib/admin/upload-actions";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  addProductImage,
  deleteProductImage,
  setPrimaryImage,
  type VariantInput,
} from "./variant-actions";

// ── Domain types ───────────────────────────────────────────────────────────

export interface Variant {
  id: string;
  product_id: string;
  memory: string | null;
  color: string | null;
  color_hex: string | null;
  sku: string | null;
  price_cash: number;
  price_card: number;
  stock: number;
  image_url: string | null;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

const emptyVariant: VariantInput = {
  memory: "",
  color: "",
  color_hex: "",
  sku: "",
  price_cash: 0,
  price_card: 0,
  stock: 0,
  image_url: "",
};

// ── Add-row form ───────────────────────────────────────────────────────────

function AddVariantRow({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [fields, setFields] = React.useState<VariantInput>(emptyVariant);
  const [pending, start] = React.useTransition();

  const set = (k: keyof VariantInput, v: string | number) =>
    setFields((p) => ({ ...p, [k]: v }));

  const submit = () => {
    start(async () => {
      const res = await createVariant(productId, {
        memory: fields.memory || undefined,
        color: fields.color || undefined,
        color_hex: fields.color_hex || undefined,
        sku: fields.sku || undefined,
        price_cash: Number(fields.price_cash) || 0,
        price_card: Number(fields.price_card) || 0,
        stock: Number(fields.stock) || 0,
        image_url: fields.image_url || undefined,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Вариант добавлен");
      setFields(emptyVariant);
      onDone();
      router.refresh();
    });
  };

  return (
    <tr className="border-b border-border/50 bg-surface/40">
      <td className="px-3 py-2">
        <TextInput
          placeholder="256GB"
          value={fields.memory ?? ""}
          onChange={(e) => set("memory", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <TextInput
            placeholder="Чёрный"
            value={fields.color ?? ""}
            onChange={(e) => set("color", e.target.value)}
            className="h-8 text-[13px]"
          />
          <input
            type="color"
            title="Цвет"
            value={fields.color_hex || "#000000"}
            onChange={(e) => set("color_hex", e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-border p-0.5"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <TextInput
          placeholder="SKU-256-BLK"
          value={fields.sku ?? ""}
          onChange={(e) => set("sku", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <TextInput
          type="number"
          min={0}
          value={fields.price_cash ?? 0}
          onChange={(e) => set("price_cash", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <TextInput
          type="number"
          min={0}
          value={fields.price_card ?? 0}
          onChange={(e) => set("price_card", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <TextInput
          type="number"
          min={0}
          value={fields.stock ?? 0}
          onChange={(e) => set("stock", e.target.value)}
          className="h-8 w-20 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-ink px-3 text-[13px] font-medium text-white hover:bg-ink/90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
            Добавить
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={pending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-white text-ink-muted hover:bg-surface disabled:opacity-60"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Edit-row inline ────────────────────────────────────────────────────────

function EditVariantRow({
  variant,
  productId,
  onDone,
}: {
  variant: Variant;
  productId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [fields, setFields] = React.useState<VariantInput>({
    memory: variant.memory ?? "",
    color: variant.color ?? "",
    color_hex: variant.color_hex ?? "",
    sku: variant.sku ?? "",
    price_cash: variant.price_cash,
    price_card: variant.price_card,
    stock: variant.stock,
    image_url: variant.image_url ?? "",
  });
  const [pending, start] = React.useTransition();

  const set = (k: keyof VariantInput, v: string | number) =>
    setFields((p) => ({ ...p, [k]: v }));

  const save = () => {
    start(async () => {
      const res = await updateVariant(variant.id, productId, {
        memory: fields.memory || undefined,
        color: fields.color || undefined,
        color_hex: fields.color_hex || undefined,
        sku: fields.sku || undefined,
        price_cash: Number(fields.price_cash) || 0,
        price_card: Number(fields.price_card) || 0,
        stock: Number(fields.stock) || 0,
        image_url: fields.image_url || undefined,
        sort_order: variant.sort_order,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Вариант сохранён");
      onDone();
      router.refresh();
    });
  };

  return (
    <tr className="border-b border-border/50 bg-ink/[0.02]">
      <td className="px-3 py-2">
        <TextInput
          placeholder="256GB"
          value={fields.memory ?? ""}
          onChange={(e) => set("memory", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <TextInput
            placeholder="Чёрный"
            value={fields.color ?? ""}
            onChange={(e) => set("color", e.target.value)}
            className="h-8 text-[13px]"
          />
          <input
            type="color"
            title="Цвет"
            value={fields.color_hex || "#000000"}
            onChange={(e) => set("color_hex", e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-border p-0.5"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <TextInput
          placeholder="SKU"
          value={fields.sku ?? ""}
          onChange={(e) => set("sku", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <TextInput
          type="number"
          min={0}
          value={fields.price_cash ?? 0}
          onChange={(e) => set("price_cash", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <TextInput
          type="number"
          min={0}
          value={fields.price_card ?? 0}
          onChange={(e) => set("price_card", e.target.value)}
          className="h-8 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <TextInput
          type="number"
          min={0}
          value={fields.stock ?? 0}
          onChange={(e) => set("stock", e.target.value)}
          className="h-8 w-20 text-[13px]"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-ink px-3 text-[13px] font-medium text-white hover:bg-ink/90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
            Сохранить
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={pending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-white text-ink-muted hover:bg-surface disabled:opacity-60"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Variants section ───────────────────────────────────────────────────────

export function VariantsSection({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Варианты</PanelTitle>
        <AdminButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Добавить вариант
        </AdminButton>
      </PanelHeader>

      {variants.length === 0 && !showAdd ? (
        <div className="px-5 py-8 text-center text-[14px] text-ink-muted">
          Варианты не добавлены. Нажмите «Добавить вариант».
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-subtle">Память</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-subtle">Цвет</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-subtle">SKU</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-subtle">Нал, ₽</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-subtle">Карта, ₽</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-subtle">Остаток</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-subtle"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) =>
                editingId === v.id ? (
                  <EditVariantRow
                    key={v.id}
                    variant={v}
                    productId={productId}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-surface/60">
                    <td className="px-3 py-3 text-ink">{v.memory ?? <span className="text-ink-subtle">—</span>}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {v.color_hex ? (
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full border border-border/50"
                            style={{ background: v.color_hex }}
                          />
                        ) : null}
                        <span className="text-ink">{v.color ?? <span className="text-ink-subtle">—</span>}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-ink-muted">{v.sku ?? "—"}</td>
                    <td className="px-3 py-3 text-sale font-medium">{fmt(v.price_cash)}</td>
                    <td className="px-3 py-3 text-ink">{fmt(v.price_card)}</td>
                    <td className="px-3 py-3 text-ink">{v.stock}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(v.id);
                            setShowAdd(false);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-white text-ink-muted hover:bg-surface hover:text-ink"
                          title="Редактировать"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        <DeleteButton
                          action={deleteVariant.bind(null, v.id, productId)}
                          itemName={[v.memory, v.color].filter(Boolean).join(" ") || v.sku || v.id}
                          iconOnly
                        />
                      </div>
                    </td>
                  </tr>
                )
              )}

              {showAdd ? (
                <AddVariantRow
                  productId={productId}
                  onDone={() => setShowAdd(false)}
                />
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ── Gallery section ────────────────────────────────────────────────────────

export function GallerySection({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [urlMode, setUrlMode] = React.useState(false);
  const [urlValue, setUrlValue] = React.useState("");
  const [settingPrimary, setSettingPrimary] = React.useState<string | null>(null);

  const handleUrl = async () => {
    const u = urlValue.trim();
    if (!u) return;
    setUploading(true);
    const res = await uploadImageFromUrl(u, "product-images", `products/${productId}`);
    if (res.error || !res.url) {
      setUploading(false);
      toast.error(res.error ?? "Не удалось загрузить");
      return;
    }
    const addRes = await addProductImage(productId, res.url);
    setUploading(false);
    if (addRes.error) {
      toast.error(addRes.error);
      return;
    }
    setUrlValue("");
    setUrlMode(false);
    toast.success("Фото добавлено по ссылке");
    router.refresh();
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("bucket", "product-images");
    fd.set("folder", `products/${productId}`);
    const res = await uploadImage(fd);
    setUploading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (!res.url) return;
    const addRes = await addProductImage(productId, res.url);
    if (addRes.error) {
      toast.error(addRes.error);
      return;
    }
    toast.success("Фото добавлено");
    router.refresh();
  };

  const handleSetPrimary = (id: string) => {
    setSettingPrimary(id);
    React.startTransition(async () => {
      const res = await setPrimaryImage(productId, id);
      setSettingPrimary(null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Главное фото изменено");
      router.refresh();
    });
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Галерея</PanelTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-white px-3 text-[13px] text-ink hover:bg-surface disabled:opacity-60"
          >
            {uploading && !urlMode ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" strokeWidth={1.75} />
            )}
            Загрузить фото
          </button>
          <button
            type="button"
            onClick={() => setUrlMode((m) => !m)}
            disabled={uploading}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-sm border px-3 text-[13px] disabled:opacity-60",
              urlMode ? "border-ink/30 bg-ink/[0.04] text-ink" : "border-border bg-white text-ink hover:bg-surface"
            )}
          >
            <Link2 className="h-4 w-4" strokeWidth={1.75} /> По ссылке
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            for (const f of files) {
              await handleFile(f);
            }
          }}
        />
      </PanelHeader>

      {urlMode ? (
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleUrl();
              }
            }}
            placeholder="https://…/photo.jpg — PNG, JPG или WebP"
            className="h-9 flex-1 rounded-sm border border-border bg-white px-2.5 text-[13px] text-ink outline-none focus:border-ink/40"
          />
          <button
            type="button"
            onClick={() => void handleUrl()}
            disabled={uploading || !urlValue.trim()}
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink bg-ink px-3 text-[13px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Добавить
          </button>
        </div>
      ) : null}

      {images.length === 0 ? (
        <div className="px-5 py-10 text-center text-[14px] text-ink-muted">
          Фотографий нет. Нажмите «Загрузить фото».
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((img) => (
            <div
              key={img.id}
              className={cn(
                "group relative overflow-hidden rounded-sm border bg-surface",
                img.is_primary
                  ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]"
                  : "border-border/70"
              )}
            >
              <div className="relative aspect-square w-full">
                {img.url ? (
                  <Image
                    src={img.url}
                    alt={img.alt ?? ""}
                    fill
                    className="object-contain p-1"
                    sizes="160px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-5 w-5 text-ink-subtle" strokeWidth={1.5} />
                  </div>
                )}
              </div>

              {img.is_primary ? (
                <div className="flex items-center gap-1 border-t border-border/50 bg-ink px-2 py-1">
                  <Star className="h-3 w-3 fill-white text-white" />
                  <span className="text-[11px] font-medium text-white">Главное</span>
                </div>
              ) : null}

              {/* Hover actions */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.is_primary ? (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(img.id)}
                    disabled={settingPrimary === img.id}
                    className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-white px-2.5 text-[12px] font-medium text-ink hover:bg-surface disabled:opacity-60"
                  >
                    {settingPrimary === img.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Star className="h-3 w-3" strokeWidth={1.75} />
                    )}
                    Главное
                  </button>
                ) : null}
                <DeleteButton
                  action={deleteProductImage.bind(null, img.id, productId)}
                  itemName="фото"
                  iconOnly
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function VariantsManager({
  productId,
  variants,
  images,
}: {
  productId: string;
  variants: Variant[];
  images: ProductImage[];
}) {
  return (
    <div className="space-y-5">
      <VariantsSection productId={productId} variants={variants} />
      <GallerySection productId={productId} images={images} />
    </div>
  );
}
