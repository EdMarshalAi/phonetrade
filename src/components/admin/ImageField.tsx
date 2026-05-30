"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Loader2, X, ImageOff, Link2 } from "lucide-react";
import { uploadImage, uploadImageFromUrl, type AdminBucket } from "@/lib/admin/upload-actions";
import { cn } from "@/lib/utils/cn";

/**
 * Загрузчик одного изображения в Storage. Контролируемый: хранит URL во
 * внешнем стейте (value/onChange). Также пишет URL в скрытый input[name],
 * чтобы значение уходило при сабмите обычной <form>.
 */
export function ImageField({
  value,
  onChange,
  bucket,
  folder,
  name,
  aspect = "square",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: AdminBucket;
  folder?: string;
  name?: string;
  aspect?: "square" | "wide";
}) {
  const [uploading, setUploading] = React.useState(false);
  const [urlMode, setUrlMode] = React.useState(false);
  const [urlValue, setUrlValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onUrl = async () => {
    const u = urlValue.trim();
    if (!u) return;
    setUploading(true);
    const res = await uploadImageFromUrl(u, bucket, folder);
    setUploading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.url) {
      onChange(res.url);
      setUrlValue("");
      setUrlMode(false);
      toast.success("Изображение загружено по ссылке");
    }
  };

  const onFile = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("bucket", bucket);
    if (folder) fd.set("folder", folder);
    const res = await uploadImage(fd);
    setUploading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.url) {
      onChange(res.url);
      toast.success("Изображение загружено");
    }
  };

  return (
    <div className="flex items-start gap-3">
      {name ? <input type="hidden" name={name} value={value ?? ""} readOnly /> : null}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-sm border border-border bg-surface",
          aspect === "square" ? "h-24 w-24" : "h-20 w-36"
        )}
      >
        {value ? (
          <Image src={value} alt="" fill className="object-contain" sizes="144px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-5 w-5 text-ink-subtle" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-white px-3 text-[13px] text-ink hover:bg-surface disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" strokeWidth={1.75} />}
            {value ? "Заменить" : "Загрузить"}
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
          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-white px-3 text-[13px] text-ink-muted hover:border-sale/40 hover:text-sale"
            >
              <X className="h-4 w-4" strokeWidth={1.75} /> Убрать
            </button>
          ) : null}
        </div>

        {urlMode ? (
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onUrl();
                }
              }}
              placeholder="https://…/photo.jpg"
              className="h-8 w-72 max-w-full rounded-sm border border-border bg-white px-2.5 text-[13px] text-ink outline-none focus:border-ink/40"
            />
            <button
              type="button"
              onClick={() => void onUrl()}
              disabled={uploading || !urlValue.trim()}
              className="inline-flex h-8 items-center gap-2 rounded-sm border border-ink bg-ink px-3 text-[13px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Загрузить
            </button>
          </div>
        ) : null}

        <p className="text-[12px] text-ink-subtle">PNG, JPG, WebP, SVG · до 8 МБ. По ссылке — только PNG, JPG, WebP.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
