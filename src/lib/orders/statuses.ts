/**
 * Единый справочник статусов заказа. Источник истины — настройки в админке
 * (`shop_settings.order_statuses`), фолбэк — DEFAULT_ORDER_STATUSES. Один список
 * используется и в карточке заказа в админке, и в личном кабинете покупателя
 * (customerLabel — формулировка для клиента, color — цвет бейджа из палитры).
 */
export interface OrderStatusDef {
  /** Стабильный ключ, который пишется в orders.status. */
  key: string;
  /** Название в админке. */
  label: string;
  /** Название в личном кабинете покупателя. */
  customerLabel: string;
  /** Ключ цвета из ORDER_STATUS_COLORS. */
  color: string;
}

/** Палитра цветов статусов (приглушённые тона, безопасные по контрасту). */
export const ORDER_STATUS_COLORS: { key: string; label: string; dot: string; badge: string }[] = [
  { key: "slate", label: "Серый", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  { key: "ink", label: "Чёрный", dot: "bg-ink", badge: "bg-ink text-white" },
  { key: "blue", label: "Синий", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  { key: "teal", label: "Бирюзовый", dot: "bg-teal-500", badge: "bg-teal-50 text-teal-700" },
  { key: "green", label: "Зелёный", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  { key: "amber", label: "Янтарный", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  { key: "violet", label: "Фиолетовый", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700" },
  { key: "pink", label: "Розовый", dot: "bg-pink-500", badge: "bg-pink-50 text-pink-700" },
  { key: "red", label: "Красный", dot: "bg-sale", badge: "bg-sale/10 text-sale" },
];

export const ORDER_COLOR_KEYS = ORDER_STATUS_COLORS.map((c) => c.key);

/** Базовые классы бейджа статуса (форма/админка). */
export const ORDER_BADGE_BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]";

export function colorEntry(key: string | null | undefined) {
  return ORDER_STATUS_COLORS.find((c) => c.key === key) ?? ORDER_STATUS_COLORS[0];
}

export const DEFAULT_ORDER_STATUSES: OrderStatusDef[] = [
  { key: "placed", label: "Оформлен", customerLabel: "Оформлен", color: "slate" },
  { key: "new", label: "Новый", customerLabel: "Принят в работу", color: "slate" },
  { key: "confirmed", label: "Подтверждён", customerLabel: "Подтверждён", color: "blue" },
  { key: "packing", label: "В сборке", customerLabel: "Собираем заказ", color: "amber" },
  { key: "ready", label: "Готов к выдаче", customerLabel: "Готов к выдаче", color: "violet" },
  { key: "shipped", label: "Передан в доставку", customerLabel: "В пути", color: "teal" },
  { key: "delivered", label: "Доставлен", customerLabel: "Доставлен", color: "green" },
  { key: "cancelled", label: "Отменён", customerLabel: "Отменён", color: "red" },
];

export function findStatus(list: OrderStatusDef[], key: string | null | undefined): OrderStatusDef | null {
  if (!key) return null;
  return list.find((s) => s.key === key) ?? null;
}
