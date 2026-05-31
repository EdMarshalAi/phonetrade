/** Типы запросов субъекта ПД (152-ФЗ, ст. 14). Общие константы (без "use server"). */
export const DSR_TYPES = {
  access: "Доступ к моим данным",
  rectify: "Изменение / уточнение данных",
  delete: "Удаление данных",
  revoke: "Отзыв согласия на обработку",
  export: "Выгрузка данных",
} as const;

export type DsrType = keyof typeof DSR_TYPES;

/** Статусы обработки обращения в админке. */
export const DSR_STATUS: Record<string, string> = {
  new: "Новое",
  in_progress: "В работе",
  done: "Выполнено",
  rejected: "Отклонено",
};

