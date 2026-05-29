import type { Product } from "@/lib/data/products";

export type CartItem = {
  productId: string;
  product: Product;
  qty: number;
};

export type DeliveryMethod = "pickup" | "courier";
export type PaymentMethod = "sbp" | "card" | "cash" | "credit";
export type CustomerType = "person" | "company";
export type CheckoutMode = "guest" | "login";

export type DeliveryTime = "any" | "morning" | "day" | "evening";

export type CheckoutState = {
  customerType: CustomerType;
  mode: CheckoutMode;
  phone: string;
  email: string;
  name: string;
  password?: string;
  companyName?: string;
  companyInn?: string;
  delivery: DeliveryMethod;
  deliveryAddress?: string;
  deliveryTime: DeliveryTime;
  payment: PaymentMethod;
  comment?: string;
  agreement: boolean;
};
