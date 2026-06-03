/**
 * Справочник подстановочных переменных писем (для кнопки «Переменные» в
 * редакторе шаблона и мастере кампаний). Значения подставляются на рантайме
 * движком renderTemplate (см. lib/email/render + actions sampleVars). Список
 * показывается пользователю с понятными названиями и примерами.
 *
 * scope: где переменная реально доступна —
 *   "template"  — триггерные/транзакционные шаблоны (есть заказ/корзина),
 *   "campaign"  — массовая рассылка (известен только клиент/промокод).
 */
export type EmailVar = { key: string; label: string; example: string };
export type EmailVarScope = "template" | "campaign";
export type EmailVarGroup = { group: string; scope: EmailVarScope[]; vars: EmailVar[] };

export const EMAIL_VARIABLE_GROUPS: EmailVarGroup[] = [
  {
    group: "Клиент",
    scope: ["template", "campaign"],
    vars: [
      { key: "customer.first_name", label: "Имя", example: "Денис" },
      { key: "customer.name", label: "Имя и фамилия", example: "Денис Астахов" },
    ],
  },
  {
    group: "Заказ",
    scope: ["template"],
    vars: [
      { key: "order.number", label: "Номер заказа", example: "PT-2026-0042" },
      { key: "order.total", label: "Сумма заказа", example: "108 000 ₽" },
      { key: "order.payment", label: "Способ оплаты", example: "Картой" },
      { key: "order.delivery", label: "Доставка", example: "Самовывоз" },
      { key: "order.status", label: "Статус", example: "В пути" },
      { key: "order.tracking_number", label: "Трек-номер", example: "CDEK-1234567" },
    ],
  },
  {
    group: "Корзина",
    scope: ["template"],
    vars: [
      { key: "cart.total", label: "Сумма корзины", example: "108 000 ₽" },
      { key: "cart.url", label: "Ссылка на корзину", example: "…/cart" },
    ],
  },
  {
    group: "Промокод",
    scope: ["template", "campaign"],
    vars: [{ key: "promo.code", label: "Промокод", example: "DEMO1000" }],
  },
  {
    group: "Служебные",
    scope: ["template", "campaign"],
    vars: [{ key: "unsubscribe_url", label: "Ссылка для отписки", example: "…/unsubscribe" }],
  },
];

/** Группы, доступные в указанном контексте. */
export function variableGroupsForScope(scope: EmailVarScope): EmailVarGroup[] {
  return EMAIL_VARIABLE_GROUPS.filter((g) => g.scope.includes(scope));
}
