import type { CartItem, CheckoutState } from "@/lib/cart/types";

export type CheckoutField =
  | "phone"
  | "email"
  | "name"
  | "deliveryAddress"
  | "companyName"
  | "companyInn"
  | "password";

export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/** Pure validator — returns one message per invalid field, or {} when valid. */
export function validateCheckout(
  state: CheckoutState,
  items: CartItem[],
  requiresAddress = false
): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (items.length === 0) return errors;

  const phoneDigits = digitsOf(state.phone).length;
  if (phoneDigits === 0) errors.phone = "Укажите телефон для связи";
  else if (phoneDigits < 11) errors.phone = "Похоже, номер неполный";

  if (!state.name.trim()) errors.name = "Укажите, как к вам обращаться";

  if (state.email.trim() && !EMAIL_RE.test(state.email.trim()))
    errors.email = "Проверьте формат e-mail";

  if (requiresAddress && !(state.deliveryAddress ?? "").trim())
    errors.deliveryAddress = "Укажите адрес доставки";

  if (state.customerType === "company") {
    if (!(state.companyName ?? "").trim())
      errors.companyName = "Укажите название компании";
    const inn = digitsOf(state.companyInn ?? "");
    if (!inn) errors.companyInn = "Укажите ИНН";
    else if (inn.length !== 10 && inn.length !== 12)
      errors.companyInn = "ИНН состоит из 10 или 12 цифр";
  }

  if (state.mode === "login" && !(state.password ?? ""))
    errors.password = "Введите пароль";

  return errors;
}
