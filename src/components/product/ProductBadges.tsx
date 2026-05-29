"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { cn } from "@/lib/utils/cn";
import type { ProductBadge } from "@/lib/content";

/* Реестр бейджей передаётся через контекст из серверного layout — чтобы любая
   карточка/страница товара резолвила ключи без проброса пропсов. */
const BadgeRegistryContext = React.createContext<ProductBadge[]>([]);

export function BadgeRegistryProvider({
  badges,
  children,
}: {
  badges: ProductBadge[];
  children: React.ReactNode;
}) {
  return <BadgeRegistryContext.Provider value={badges}>{children}</BadgeRegistryContext.Provider>;
}

export function useBadgeRegistry() {
  return React.useContext(BadgeRegistryContext);
}

const pill =
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium tracking-tight " +
  "shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]";

/** Один бейдж: цвета из реестра, подсказка при наведении (как InfoBadge). */
function Badge({ badge }: { badge: ProductBadge }) {
  const style = { backgroundColor: badge.bg, color: badge.fg };
  if (!badge.tooltip) {
    return (
      <span className={pill} style={style}>
        {badge.label}
      </span>
    );
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={(props) => (
          <span {...props} className={cn(pill, "cursor-help")} style={style}>
            {badge.label}
            <Info className="size-3 opacity-70" aria-hidden />
          </span>
        )}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} side="top" align="start" className="z-[100]">
          <Tooltip.Popup
            className={cn(
              "max-w-[260px] rounded-xl bg-ink px-3 py-2 text-xs leading-relaxed text-white",
              "shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200"
            )}
          >
            {badge.tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * Единый рендер бейджей товара — слева, одинаково в карточках (главная/каталог)
 * и на странице товара. Ключи резолвятся из реестра, порядок — как в реестре.
 */
export function ProductBadges({
  badges,
  className,
}: {
  badges?: string[] | null;
  className?: string;
}) {
  const registry = useBadgeRegistry();
  if (!badges || badges.length === 0) return null;
  const resolved = registry.filter((b) => badges.includes(b.key)); // порядок реестра, неизвестные ключи отброшены
  if (resolved.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-start gap-1.5", className)}>
      {resolved.map((b) => (
        <Badge key={b.key} badge={b} />
      ))}
    </div>
  );
}
