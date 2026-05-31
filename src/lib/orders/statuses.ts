/**
 * Единый справочник статусов заказа. Источник истины — настройки в админке
 * (`shop_settings.order_statuses`), фолбэк — DEFAULT_ORDER_STATUSES. Один и тот
 * же список используется и в карточке заказа в админке, и в личном кабинете
 * покупателя (поле customerLabel — формулировка для клиента).
 */
export type OrderStatusTone = "neutral" | "outline" | "strong" | "danger";

export interface OrderStatusDef {
  /** Стабильный ключ, который пишется в orders.status. */
  key: string;
  /** Название в админке. */
  label: string;
  /** Название в личном кабинете покупателя. */
  customerLabel: string;
  /** Цвет бейджа (админка + ЛК). */
  tone: OrderStatusTone;
}

export const DEFAULT_ORDER_STATUSES: OrderStatusDef[] = [
  { key: "placed", label: "Оформлен", customerLabel: "Оформлен", tone: "neutral" },
  { key: "new", label: "Новый", customerLabel: "Принят в работу", tone: "neutral" },
  { key: "confirmed", label: "Подтверждён", customerLabel: "Подтверждён", tone: "outline" },
  { key: "packing", label: "В сборке", customerLabel: "Собираем заказ", tone: "outline" },
  { key: "ready", label: "Готов к выдаче", customerLabel: "Готов к выдаче", tone: "outline" },
  { key: "shipped", label: "Передан в доставку", customerLabel: "В пути", tone: "outline" },
  { key: "delivered", label: "Доставлен", customerLabel: "Доставлен", tone: "strong" },
  { key: "cancelled", label: "Отменён", customerLabel: "Отменён", tone: "danger" },
];

export const ORDER_TONE_OPTIONS: { value: OrderStatusTone; label: string }[] = [
  { value: "neutral", label: "Серый" },
  { value: "outline", label: "Контур" },
  { value: "strong", label: "Тёмный (успех)" },
  { value: "danger", label: "Красный (отмена)" },
];

export function findStatus(list: OrderStatusDef[], key: string | null | undefined): OrderStatusDef | null {
  if (!key) return null;
  return list.find((s) => s.key === key) ?? null;
}

/** Классы бейджа для личного кабинета (клиентская сторона). */
export function customerToneClass(tone: OrderStatusTone): string {
  switch (tone) {
    case "strong":
      return "bg-ink text-white";
    case "danger":
      return "bg-sale/10 text-sale";
    case "outline":
      return "bg-white text-ink ring-1 ring-border";
    default:
      return "bg-surface text-ink";
  }
}
