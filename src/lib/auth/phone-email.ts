/** Телефон → синтетический email для Supabase Auth (без SMS-провайдера). */
export function phoneToEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@phonetrade.local`;
}
