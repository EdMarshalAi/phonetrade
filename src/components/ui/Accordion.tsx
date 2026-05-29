"use client";

import * as React from "react";
import { Accordion as BaseAccordion } from "@base-ui-components/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Root>) {
  return (
    <BaseAccordion.Root
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

export function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Item>) {
  return (
    <BaseAccordion.Item
      className={cn(
        "rounded-2xl bg-ink text-white overflow-hidden border border-ink",
        className
      )}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Trigger>) {
  return (
    <BaseAccordion.Header className="w-full">
      <BaseAccordion.Trigger
        className={cn(
          "group flex w-full items-center justify-between px-5 py-4 text-left text-[15px] font-medium text-white",
          "transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          className
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown
          className="size-5 shrink-0 text-onDark-muted transition-transform duration-300 group-data-[panel-open]:rotate-180"
          aria-hidden
        />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

export function AccordionPanel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Panel>) {
  return (
    <BaseAccordion.Panel
      className={cn(
        "overflow-hidden text-sm leading-relaxed text-onDark-muted",
        "h-[var(--accordion-panel-height)] transition-[height] duration-300 ease-out",
        "data-[starting-style]:h-0 data-[ending-style]:h-0",
        className
      )}
      {...props}
    >
      <div className="px-5 pb-5 pt-1">{children}</div>
    </BaseAccordion.Panel>
  );
}
