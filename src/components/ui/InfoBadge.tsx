"use client";

import * as React from "react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  text: string;
  tooltip?: string;
  className?: string;
};

const baseClass =
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium tracking-tight";

export function InfoBadge({ text, tooltip, className }: Props) {
  if (!tooltip) {
    return <span className={cn(baseClass, className)}>{text}</span>;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={(props) => (
          <span
            {...props}
            className={cn(baseClass, "cursor-help", className)}
          >
            {text}
            <Info className="size-3 opacity-70" aria-hidden />
          </span>
        )}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} side="top" align="start" className="z-[100]">
          <Tooltip.Popup
            className={cn(
              "max-w-[260px] rounded-xl bg-ink text-white text-xs leading-relaxed px-3 py-2",
              "shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "transition-opacity duration-200"
            )}
          >
            {tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
