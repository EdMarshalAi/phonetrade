import * as React from "react";
import Image from "next/image";
import { resolveIcon } from "@/lib/admin/icons";
import type { ShopContactLink } from "@/lib/content";
import { cn } from "@/lib/utils/cn";

/** Рендер управляемых контакт-ссылок (иконка-пресет или загруженная картинка). */
export function ContactLinks({
  contacts,
  location,
  className,
  itemClassName,
  iconClassName = "size-3.5",
}: {
  contacts: ShopContactLink[] | undefined;
  location: "header" | "footer";
  className?: string;
  itemClassName?: string;
  iconClassName?: string;
}) {
  const items = (contacts ?? []).filter(
    (c) => c.enabled && (c.location === location || c.location === "both")
  );
  if (items.length === 0) return null;
  return (
    <div className={className}>
      {items.map((c) => {
        const Icon = c.iconUrl ? null : resolveIcon(c.icon);
        const external = /^https?:/.test(c.href);
        return (
          <a
            key={c.id}
            href={c.href}
            aria-label={c.label}
            title={c.label}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={itemClassName}
          >
            {c.iconUrl ? (
              <Image src={c.iconUrl} alt="" width={18} height={18} className={cn("object-contain", iconClassName)} />
            ) : Icon ? (
              <Icon className={iconClassName} aria-hidden />
            ) : null}
          </a>
        );
      })}
    </div>
  );
}
