export type OrderStatus = "placed" | "shipping" | "delivered";

export type OrderItem = {
  id: string;
  title: string;
  image: string;
  qty: number;
  priceCash: number;
};

export type Order = {
  id: string;
  /** ISO date, e.g. "2026-05-20" */
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  delivery: string;
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Оформлен",
  shipping: "В пути",
  delivered: "Доставлен",
};
