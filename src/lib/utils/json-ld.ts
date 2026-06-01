/**
 * Безопасная сериализация JSON-LD для вставки в <script> через
 * dangerouslySetInnerHTML: экранирует <, >, &, чтобы данные из БД
 * (названия товаров/категорий) не могли «выйти» из тега (</script>)
 * или внедрить разметку.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
