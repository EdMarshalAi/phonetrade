"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2, Copy, Check } from "lucide-react";
import { uploadImage, type AdminBucket } from "@/lib/admin/upload-actions";
import { AdminButton } from "@/components/admin/form";

export function MediaUploader({ bucket }: { bucket: AdminBucket }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("bucket", bucket);
    const res = await uploadImage(fd);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Загружено");
      router.refresh();
    }
  };

  return (
    <>
      <AdminButton type="button" onClick={() => inputRef.current?.click()} loading={busy}>
        {!busy ? <Upload className="h-4 w-4" strokeWidth={1.75} /> : <Loader2 className="h-4 w-4 animate-spin" />}
        Загрузить
      </AdminButton>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </>
  );
}

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("URL скопирован");
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-white text-ink-muted hover:bg-surface"
      title="Копировать URL"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-ink" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />}
    </button>
  );
}
