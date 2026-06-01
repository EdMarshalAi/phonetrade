/**
 * Каталог устройств и типовых поломок для страницы «Ремонт техники».
 * Отдельный модуль (не HTML-страница) — данные в коде, как у trade-in/options.
 * Модельный ряд и услуги собраны с pedant.ru. ЦЕН НЕТ — только перечень работ.
 */

export type DeviceCategoryKey = "iphone" | "ipad" | "mac" | "other";

export interface DeviceCategory {
  key: DeviceCategoryKey;
  title: string;
  /** Подпись для шага «другое устройство» (свободный ввод). */
  freeInput?: boolean;
  models: string[];
}

export const DEVICE_CATEGORIES: DeviceCategory[] = [
  {
    key: "iphone",
    title: "iPhone",
    models: [
      "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17", "iPhone 17e", "iPhone Air",
      "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e",
      "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
      "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
      "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
      "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
      "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
      "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
      "iPhone SE (2022)", "iPhone SE (2020)",
      "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7",
      "iPhone 6s Plus", "iPhone 6s",
    ],
  },
  {
    key: "ipad",
    title: "iPad",
    models: [
      "iPad Pro 13 (M4)", "iPad Pro 11 (M4)", "iPad Pro 12.9", "iPad Pro 11",
      "iPad Air 13 (M2)", "iPad Air 11 (M2)", "iPad Air (M1)", "iPad Air",
      "iPad 11 (A16)", "iPad 10.9", "iPad 10.2", "iPad mini 7", "iPad mini",
    ],
  },
  {
    key: "mac",
    title: "MacBook",
    models: [
      "MacBook Air 15 (M4)", "MacBook Air 13 (M4)", "MacBook Air 15 (M3)", "MacBook Air 13 (M3)",
      "MacBook Air (M2)", "MacBook Air (M1)",
      "MacBook Pro 16 (M4)", "MacBook Pro 14 (M4)", "MacBook Pro 16 (M3)", "MacBook Pro 14 (M3)",
      "MacBook Pro 13 (M2)", "MacBook Pro 13 (M1)",
    ],
  },
  {
    key: "other",
    title: "Другое устройство",
    freeInput: true,
    models: ["Apple Watch", "AirPods", "iMac", "Mac mini", "Другое устройство Apple"],
  },
];

/** Типовые услуги/поломки (с pedant.ru) — БЕЗ ЦЕН. */
export interface RepairIssue {
  key: string;
  label: string;
  /** Бесплатная услуга (диагностика) — помечаем. */
  free?: boolean;
}

export const REPAIR_ISSUES: RepairIssue[] = [
  { key: "diagnostics", label: "Бесплатная диагностика", free: true },
  { key: "screen", label: "Замена экрана / дисплея" },
  { key: "glass", label: "Замена стекла" },
  { key: "battery", label: "Замена аккумулятора" },
  { key: "back", label: "Замена задней крышки" },
  { key: "charge_port", label: "Не заряжается / разъём зарядки" },
  { key: "camera", label: "Ремонт / замена камеры" },
  { key: "audio", label: "Динамик, микрофон, звук" },
  { key: "water", label: "Попадание влаги" },
  { key: "no_power", label: "Не включается" },
  { key: "buttons", label: "Кнопки (звук, питание, Home)" },
  { key: "software", label: "Прошивка / ПО / зависает" },
  { key: "other", label: "Другая проблема" },
];

export function issueLabel(key: string): string {
  return REPAIR_ISSUES.find((i) => i.key === key)?.label ?? key;
}
