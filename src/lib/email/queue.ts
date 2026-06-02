import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Очередь триггерных писем и работа с сегментами (см. docs/email-marketing.md
 * §6.1, §5). Транзакционные письма шлются синхронно (см. lib/email/templates),
 * очередь — только для отложенных/маркетинговых триггеров.
 */

/** slug сегмента → имя SQL-view. cart_abandoners — после персистентной корзины. */
export const SEGMENT_VIEWS: Record<string, string> = {
  all: "segment_all_subscribers",
  active: "segment_active_buyers",
  vip: "segment_vip",
  dormant: "segment_dormant",
  newcomers: "segment_newcomers",
  iphone: "segment_iphone_owners",
  cart_abandoners: "segment_cart_abandoners",
};

export const SEGMENT_LABELS: Record<string, string> = {
  all: "Все подписчики",
  active: "Активные покупатели",
  vip: "VIP-клиенты",
  dormant: "Спящие",
  newcomers: "Новички",
  iphone: "Владельцы iPhone",
  cart_abandoners: "Брошенные корзины",
};

export type SegmentRecipient = { id: string; email: string; name: string | null };

/** Размер сегмента (для UI «будет отправлено N писем»). */
export async function getSegmentSize(slug: string): Promise<number> {
  const view = SEGMENT_VIEWS[slug];
  if (!view) return 0;
  const db = createSupabaseAdminClient();
  const { count } = await db.from(view).select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** Получатели сегмента (для рассылки кампании). */
export async function getSegmentRecipients(slug: string): Promise<SegmentRecipient[]> {
  const view = SEGMENT_VIEWS[slug];
  if (!view) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db.from(view).select("id,email,name");
  return (data ?? []) as SegmentRecipient[];
}

/**
 * Поставить триггерное письмо в очередь. Идемпотентно: повтор по dedup_key
 * молча пропускается (уникальный индекс). Неактивный/несуществующий триггер —
 * skipped.
 */
export async function enqueueTrigger(opts: {
  triggerSlug: string;
  customerId?: string | null;
  recipientEmail: string;
  variables?: Record<string, unknown>;
  scheduledAt: Date;
  dedupKey?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!opts.recipientEmail) return { ok: false, skipped: true };
  try {
    const db = createSupabaseAdminClient();
    const { data: trig } = await db
      .from("email_triggers")
      .select("id,template_id,is_active")
      .eq("slug", opts.triggerSlug)
      .maybeSingle();
    if (!trig || !trig.is_active) return { ok: false, skipped: true };

    const { error } = await db.from("email_queue").insert({
      trigger_id: trig.id,
      customer_id: opts.customerId ?? null,
      recipient_email: opts.recipientEmail,
      template_id: trig.template_id,
      variables: opts.variables ?? {},
      scheduled_at: opts.scheduledAt.toISOString(),
      dedup_key: opts.dedupKey ?? null,
      status: "pending",
    });
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return { ok: true, skipped: true };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ошибка постановки в очередь" };
  }
}

/** Отменить отложенные письма по префиксу dedup_key (напр. при заказе из брошенной корзины). */
export async function cancelQueuedByDedupPrefix(prefix: string): Promise<void> {
  const db = createSupabaseAdminClient();
  await db.from("email_queue").update({ status: "cancelled" }).like("dedup_key", `${prefix}%`).eq("status", "pending");
}
