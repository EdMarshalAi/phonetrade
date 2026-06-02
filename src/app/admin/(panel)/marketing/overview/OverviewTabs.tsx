"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { key: "summary", label: "Сводка" },
  { key: "sends", label: "Отправки" },
  { key: "automations", label: "Триггеры и кампании" },
];
const PERIODS = [
  { key: "7", label: "7 дней" },
  { key: "30", label: "30 дней" },
  { key: "90", label: "90 дней" },
  { key: "365", label: "Год" },
];

export function OverviewTabs({ tab, period }: { tab: string; period: string }) {
  const href = (t: string, p: string) => `/admin/marketing/overview?tab=${t}&period=${p}`;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-white p-1">
        {TABS.map((t) => (
          <Link key={t.key} href={href(t.key, period)} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors", tab === t.key ? "bg-ink text-white" : "text-ink-muted hover:text-ink")}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {PERIODS.map((p) => (
          <Link key={p.key} href={href(tab, p.key)} className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", period === p.key ? "border-ink bg-ink text-white" : "border-border text-ink-muted hover:text-ink")}>
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
