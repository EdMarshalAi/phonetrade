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
  /** Сырой ключ статуса (orders.status). */
  statusKey: string;
  /** Название статуса для клиента (из настроек статусов заказа). */
  statusLabel: string;
  /** Ключ цвета бейджа статуса (из палитры ORDER_STATUS_COLORS). */
  statusColor: string;
  items: OrderItem[];
  total: number;
  delivery: string;
};
