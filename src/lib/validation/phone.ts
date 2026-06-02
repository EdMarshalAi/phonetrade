import { z } from "zod";

/**
 * Валидация и нормализация российских МОБИЛЬНЫХ номеров (+79XXXXXXXXX).
 * Городские (+7495…), иностранные и мусор — отклоняются.
 * См. docs/promo-analytics-phone-validation.md (задача 2).
 */
const RU_MOBILE_RE = /^\+79\d{9}$/;

/** Нормализует номер к +79XXXXXXXXX. null если невалидный мобильный РФ. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d+]/g, ""); // оставляем цифры и +

  if (digits.startsWith("8") && digits.length === 11) digits = "+7" + digits.slice(1);
  else if (digits.startsWith("7") && digits.length === 11) digits = "+" + digits;
  else if (!digits.startsWith("+") && digits.length === 10) digits = "+7" + digits;

  return RU_MOBILE_RE.test(digits) ? digits : null;
}

export function isValidRussianPhone(input: string | null | undefined): boolean {
  return normalizePhone(input) !== null;
}

/** Форматирует к виду +7 (904) 098-88-77. Невалидный — возвращает как есть. */
export function formatPhone(phone: string | null | undefined): string {
  const n = normalizePhone(phone);
  if (!n) return phone ?? "";
  const d = n.slice(2); // без +7
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}

/** Zod-схема: нормализует и валидирует. */
export const phoneSchema = z
  .string()
  .min(1, "Введите номер телефона")
  .transform((v) => normalizePhone(v))
  .refine((v): v is string => v !== null, { message: "Введите мобильный РФ: +7 (9XX) XXX-XX-XX" });
