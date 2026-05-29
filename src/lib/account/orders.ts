import { ALL_PRODUCTS } from "@/lib/data/products";

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

function ordersKey(phone: string): string {
  return `pt:orders:${phone.replace(/\D/g, "")}`;
}

function lineFrom(id: string, qty: number): OrderItem | null {
  const p = ALL_PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  return { id: p.id, title: p.title, image: p.image, qty, priceCash: p.priceCash };
}

function buildOrder(
  id: string,
  date: string,
  status: OrderStatus,
  delivery: string,
  lines: [string, number][]
): Order {
  const items = lines
    .map(([id, qty]) => lineFrom(id, qty))
    .filter((x): x is OrderItem => x !== null);
  const total = items.reduce((acc, i) => acc + i.priceCash * i.qty, 0);
  return { id, date, status, delivery, items, total };
}

/** Demo history shown until a real backend is wired. */
function seedOrders(): Order[] {
  return [
    buildOrder("BG-104877", "2026-05-21", "delivered", "Самовывоз", [
      ["ip17-128-black", 1],
      ["airpods-pro-3", 1],
    ]),
    buildOrder("BG-103240", "2026-04-09", "delivered", "Курьер по Белгороду", [
      ["ip17-256-black", 1],
    ]),
  ].filter((o) => o.items.length > 0);
}

export function loadOrders(phone: string): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ordersKey(phone));
    const stored: Order[] = raw ? JSON.parse(raw) : [];
    return [...stored, ...seedOrders()];
  } catch {
    return seedOrders();
  }
}

export function saveOrder(phone: string, order: Order): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(ordersKey(phone));
    const stored: Order[] = raw ? JSON.parse(raw) : [];
    window.localStorage.setItem(
      ordersKey(phone),
      JSON.stringify([order, ...stored])
    );
  } catch {
    /* ignore */
  }
}
