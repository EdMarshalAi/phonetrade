"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

export function PhoneCell({ phone }: { phone: string | null }) {
  const [copied, setCopied] = React.useState(false);
  if (!phone) return <span className="text-ink-subtle">—</span>;
  const tel = "+" + phone.replace(/\D/g, "");
  return (
    <span className="inline-flex items-center gap-1.5">
      <a href={`tel:${tel}`} className="font-medium tabular-nums text-ink hover:underline">{phone}</a>
      <button
        type="button"
        aria-label="Скопировать телефон"
        onClick={() => { navigator.clipboard?.writeText(phone); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }}
        className="inline-flex size-6 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-surface hover:text-ink"
      >
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
