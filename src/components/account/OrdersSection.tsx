"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { type Order } from "@/lib/account/orders";
import { colorEntry } from "@/lib/orders/statuses";
import { getOrdersByPhone } from "@/lib/account/orders-server";
import { formatPrice } from "@/lib/utils/format-price";
import { pluralizeItems } from "@/lib/utils/plural";
import { cn } from "@/lib/utils/cn";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function OrdersSection() {
  const { user } = useAuth();
  const [orders, setOrders] = React.useState<Order[] | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!user) return;
    getOrdersByPhone(user.phone)
      .then((o) => active && setOrders(o))
      .catch(() => active && setOrders([]));
    return () => {
      active = false;
    };
  }, [user]);

  if (orders === null) {
    return (
      <div className="rounded-3xl bg-white border border-border/60 p-8 text-sm text-ink-muted">
        Загрузка заказов…
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl bg-white border border-border/60 p-10 text-center">
        <span
          aria-hidden
          className="inline-flex size-12 items-center justify-center rounded-full bg-surface text-ink mb-4"
        >
          <Package className="size-5" />
        </span>
        <p className="text-lg font-semibold text-ink">Заказов пока нет</p>
        <p className="mt-2 text-sm text-ink-muted">
          Самое время выбрать что-нибудь из каталога.
        </p>
        <Link
          href="/category/iphone"
          className="inline-flex items-center mt-6 h-11 px-6 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
        >
          В каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => {
        const totalQty = order.items.reduce((acc, i) => acc + i.qty, 0);
        return (
          <article
            key={order.id}
            className="rounded-3xl bg-white border border-border/60 p-5 md:p-6"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-border/60">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Заказ {order.id}
                </p>
                <p className="text-[13px] text-ink-muted mt-0.5">
                  {formatDate(order.date)} · {order.delivery}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center h-7 px-3 rounded-full text-[12px] font-medium",
                  colorEntry(order.statusColor).badge
                )}
              >
                {order.statusLabel}
              </span>
            </div>

            <ul className="flex flex-wrap gap-3 py-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <Link
                    href={`/product/${item.id}`}
                    className="relative size-14 shrink-0 rounded-xl bg-surface overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="56px"
                      className="object-contain p-1.5"
                      unoptimized
                    />
                  </Link>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink leading-snug line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-[12px] text-ink-muted tabular-nums">
                      {item.qty} × {formatPrice(item.priceCash)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <span className="text-[13px] text-ink-muted">
                {totalQty} {pluralizeItems(totalQty)}
              </span>
              <span className="text-base font-bold text-ink tabular-nums">
                {formatPrice(order.total)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
