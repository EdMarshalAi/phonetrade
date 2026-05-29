export const ORDER_STATUS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  packing: "В сборке",
  ready: "Готов к выдаче",
  shipped: "Передан в доставку",
  delivered: "Доставлен",
  cancelled: "Отменён",
  placed: "Оформлен",
};

/** Допустимые переходы статусов (state machine). */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  placed: ["new", "confirmed", "cancelled"],
  new: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["ready", "shipped", "cancelled"],
  ready: ["delivered", "shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function orderStatusTone(status: string): "neutral" | "strong" | "outline" | "danger" {
  if (status === "delivered") return "strong";
  if (status === "cancelled") return "danger";
  if (status === "new" || status === "placed") return "neutral";
  return "outline";
}

export const PAYMENT_LABEL: Record<string, string> = {
  sbp: "СБП",
  card: "Карта",
  on_delivery: "При получении",
  cash: "Наличные",
  installment: "Рассрочка",
  credit: "Кредит",
};

export const DELIVERY_LABEL: Record<string, string> = {
  pickup: "Самовывоз",
  courier: "Курьер",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  paid: "Оплачен",
  refunded: "Возврат",
};
