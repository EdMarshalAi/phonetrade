"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/admin/form";
import { Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { saveHomeBlocksVisibility, type HomeBlocksVisibility } from "./actions";

const LABELS: { key: keyof HomeBlocksVisibility; label: string; hint: string }[] = [
  { key: "bento", label: "Bento «Каталог Apple»", hint: "Сетка плиток категорий" },
  { key: "trade_in", label: "Trade-in блок и шаги", hint: "Промо-блок обмена + «Как работает»" },
  { key: "advantages", label: "Преимущества", hint: "«Почему выбирают PhoneTrade»" },
];

export function VisibilityControls({ initial }: { initial: HomeBlocksVisibility }) {
  const router = useRouter();
  const [value, setValue] = React.useState<HomeBlocksVisibility>(initial);
  const [pending, start] = React.useTransition();

  const toggle = (key: keyof HomeBlocksVisibility, next: boolean) => {
    const updated = { ...value, [key]: next };
    setValue(updated);
    start(async () => {
      const res = await saveHomeBlocksVisibility(updated);
      if (res.error) {
        toast.error(res.error);
        setValue(value); // откат
        return;
      }
      toast.success(next ? "Блок показан на главной" : "Блок скрыт с главной");
      router.refresh();
    });
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Видимость блоков на главной</PanelTitle>
        <span className="text-[12px] text-ink-subtle">переключатели применяются сразу</span>
      </PanelHeader>
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {LABELS.map(({ key, label, hint }) => (
          <div key={key} className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-surface/40 p-3.5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-ink">{label}</p>
              <p className="mt-0.5 text-[12px] text-ink-subtle">{hint}</p>
            </div>
            <Switch checked={value[key]} onChange={(v) => toggle(key, v)} disabled={pending} />
          </div>
        ))}
      </div>
    </Panel>
  );
}
