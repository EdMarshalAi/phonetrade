/** ISO-метка N дней назад. Вынесено из server-компонентов, чтобы не нарушать
 *  правило react-hooks/purity (Date.now нельзя звать прямо в render). */
export function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
