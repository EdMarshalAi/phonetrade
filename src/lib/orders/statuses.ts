/**
 * Единый справочник статусов заказа. Источник истины — настройки в админке
 * (`shop_settings.order_statuses`), фолбэк — DEFAULT_ORDER_STATUSES. Один список
 * используется и в карточке заказа в админке, и в личном кабинете покупателя.
 * Цвет — произвольный HEX (выбор как в Hero-баннерах: палитра + hex).
 */
export interface OrderStatusDef {
  /** Стабильный ключ, который пишется в orders.status. */
  key: string;
  /** Название в админке. */
  label: string;
  /** Название в личном кабинете покупателя. */
  customerLabel: string;
  /** HEX-цвет бейджа, напр. "#2563eb". */
  color: string;
}

export const DEFAULT_STATUS_COLOR = "#8a8a8e";

/** Базовые классы бейджа статуса (форма/админка/ЛК); цвет задаётся inline-стилем. */
export const ORDER_BADGE_BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]";

export function normalizeHex(hex: string | null | undefined): string {
  const v = (hex ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : DEFAULT_STATUS_COLOR;
}

/** Читаемый цвет текста (белый/чёрный) на фоне данного цвета. */
function readableOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#1d1d1f" : "#ffffff";
}

/** Inline-стиль бейджа статуса по HEX-цвету. */
export function statusBadgeStyle(hex: string | null | undefined): { backgroundColor: string; color: string } {
  const c = normalizeHex(hex);
  return { backgroundColor: c, color: readableOn(c) };
}

export const DEFAULT_ORDER_STATUSES: OrderStatusDef[] = [
  { key: "placed", label: "Оформлен", customerLabel: "Оформлен", color: "#8a8a8e" },
  { key: "new", label: "Новый", customerLabel: "Принят в работу", color: "#8a8a8e" },
  { key: "confirmed", label: "Подтверждён", customerLabel: "Подтверждён", color: "#2563eb" },
  { key: "packing", label: "В сборке", customerLabel: "Собираем заказ", color: "#d97706" },
  { key: "ready", label: "Готов к выдаче", customerLabel: "Готов к выдаче", color: "#7c3aed" },
  { key: "shipped", label: "Передан в доставку", customerLabel: "В пути", color: "#0d9488" },
  { key: "delivered", label: "Доставлен", customerLabel: "Доставлен", color: "#16a34a" },
  { key: "cancelled", label: "Отменён", customerLabel: "Отменён", color: "#e30000" },
];

export function findStatus(list: OrderStatusDef[], key: string | null | undefined): OrderStatusDef | null {
  if (!key) return null;
  return list.find((s) => s.key === key) ?? null;
}
