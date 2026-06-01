/**
 * Каталог колонок экспорта прайса — общий для клиента (модалка выбора) и
 * сервера (сборка файла). Это НЕ "use server" модуль, поэтому из него можно
 * экспортировать константы/типы для обеих сторон.
 */
export type ExportColumnKey =
  | "sku"
  | "title"
  | "category"
  | "color"
  | "memory"
  | "sim"
  | "options"
  | "cost_rub"
  | "cost_rate"
  | "cost_usd"
  | "price_cash"
  | "price_card"
  | "credit"
  | "margin"
  | "override"
  | "updated";

export interface ExportColumnDef {
  key: ExportColumnKey;
  label: string;
  group: string;
}

/** Порядок здесь задаёт порядок колонок в файле. */
export const EXPORT_COLUMNS: ExportColumnDef[] = [
  { key: "title", label: "Название", group: "Основное" },
  { key: "price_cash", label: "Цена наличными", group: "Основное" },
  { key: "price_card", label: "Цена картой", group: "Основное" },
  { key: "sku", label: "Артикул", group: "Основное" },
  { key: "category", label: "Категория", group: "Основное" },
  { key: "color", label: "Цвет", group: "Характеристики" },
  { key: "memory", label: "Память", group: "Характеристики" },
  { key: "sim", label: "SIM", group: "Характеристики" },
  { key: "options", label: "Доп. характеристики", group: "Характеристики" },
  { key: "credit", label: "Рассрочка 6/12/24 мес", group: "Рассрочка" },
  { key: "cost_rub", label: "Закупка ₽", group: "Закуп и маржа" },
  { key: "cost_rate", label: "Курс закупа", group: "Закуп и маржа" },
  { key: "cost_usd", label: "Закупка $", group: "Закуп и маржа" },
  { key: "margin", label: "Маржа %", group: "Закуп и маржа" },
  { key: "override", label: "Цена зафиксирована", group: "Прочее" },
  { key: "updated", label: "Обновлено", group: "Прочее" },
];

/** По умолчанию: название + обе цены (как просил владелец). */
export const DEFAULT_EXPORT_COLUMNS: ExportColumnKey[] = ["title", "price_cash", "price_card"];

export interface PricingExportPrefs {
  /** Ключи колонок (порядок не важен — берётся из EXPORT_COLUMNS). */
  columns: ExportColumnKey[];
  /** Выбранные категории (slug). null или пусто = все категории. */
  categories: string[] | null;
}

export const DEFAULT_EXPORT_PREFS: PricingExportPrefs = {
  columns: DEFAULT_EXPORT_COLUMNS,
  categories: null,
};

/** Настройки YML-фида для ВК. */
export interface YmlFeedPrefs {
  /** Главные категории (slug, parent_slug IS NULL). null/пусто = все. Дети наследуют. */
  categories: string[] | null;
  /** Включать ли Б/У товары в фид. */
  includeUsed: boolean;
}

export const DEFAULT_YML_PREFS: YmlFeedPrefs = { categories: null, includeUsed: true };
