/**
 * Каталог устройств и ТИПОВЫХ поломок для страницы «Ремонт техники».
 * Поломки СВОИ под каждый тип техники. iPhone выбирается в два шага: серия →
 * модель (плитки с фото). ЦЕН НЕТ. Диагностику НЕ предлагаем (по требованию).
 */

export type DeviceCategoryKey = "iphone" | "ipad" | "mac" | "watch" | "airpods" | "phone" | "other";

export interface PhoneSeries {
  key: string;
  title: string;
  /** Представительная модель серии — её фото используется как плитка серии. */
  cover: string;
  models: string[];
}

export interface DeviceCategory {
  key: DeviceCategoryKey;
  title: string;
  freeInput?: boolean;
  /** Для iPhone: выбор в два шага (серия → модель). */
  series?: PhoneSeries[];
  /** Для остальных типов: плоский список моделей. */
  models?: string[];
}

/** Серии iPhone — начиная с iPhone 8 (по требованию). cover = модель для фото. */
export const IPHONE_SERIES: PhoneSeries[] = [
  { key: "17", title: "iPhone 17", cover: "iPhone 17 Pro Max", models: ["iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17", "iPhone 17e"] },
  { key: "air", title: "iPhone Air", cover: "iPhone Air", models: ["iPhone Air"] },
  { key: "16", title: "iPhone 16", cover: "iPhone 16 Pro Max", models: ["iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e"] },
  { key: "15", title: "iPhone 15", cover: "iPhone 15 Pro Max", models: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15"] },
  { key: "14", title: "iPhone 14", cover: "iPhone 14 Pro Max", models: ["iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14"] },
  { key: "13", title: "iPhone 13", cover: "iPhone 13 Pro Max", models: ["iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini"] },
  { key: "12", title: "iPhone 12", cover: "iPhone 12 Pro Max", models: ["iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini"] },
  { key: "11", title: "iPhone 11", cover: "iPhone 11 Pro Max", models: ["iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11"] },
  { key: "x", title: "iPhone X / XR / XS", cover: "iPhone XR", models: ["iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X"] },
  { key: "se", title: "iPhone SE", cover: "iPhone SE (2022)", models: ["iPhone SE (2022)", "iPhone SE (2020)"] },
  { key: "8", title: "iPhone 8", cover: "iPhone 8", models: ["iPhone 8 Plus", "iPhone 8"] },
];

export const DEVICE_CATEGORIES: DeviceCategory[] = [
  { key: "iphone", title: "iPhone", series: IPHONE_SERIES },
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
    key: "watch",
    title: "Apple Watch",
    models: [
      "Apple Watch Ultra 2", "Apple Watch Ultra",
      "Apple Watch Series 10", "Apple Watch Series 9", "Apple Watch Series 8", "Apple Watch Series 7",
      "Apple Watch Series 6", "Apple Watch Series 5", "Apple Watch Series 4", "Apple Watch Series 3",
      "Apple Watch SE (2022)", "Apple Watch SE",
    ],
  },
  {
    key: "airpods",
    title: "AirPods",
    models: ["AirPods Pro 2", "AirPods Pro", "AirPods 4", "AirPods 3", "AirPods 2", "AirPods", "AirPods Max"],
  },
  {
    key: "phone",
    title: "Другой смартфон",
    freeInput: true,
    models: ["Samsung", "Xiaomi", "Honor", "Huawei", "Realme", "OPPO", "vivo", "Google Pixel", "OnePlus", "Tecno", "Другой смартфон"],
  },
  {
    key: "other",
    title: "Другое",
    freeInput: true,
    models: ["iMac", "Mac mini", "Mac Studio", "Mac Pro", "Apple TV", "HomePod", "Другое устройство Apple"],
  },
];

/** Фото устройств (модель → URL в Storage). Заполняется отдельным скриптом. */
export const DEVICE_IMAGES: Record<string, string> = {};

export function deviceImage(model: string): string | null {
  return DEVICE_IMAGES[model] ?? null;
}

/** Типовая услуга/поломка (без цены). */
export interface RepairIssue {
  key: string;
  label: string;
}

/** Поломки СВОИ под каждый тип техники (без диагностики). */
export const ISSUES_BY_CATEGORY: Record<DeviceCategoryKey, RepairIssue[]> = {
  iphone: [
    { key: "screen", label: "Замена экрана / дисплея" },
    { key: "glass", label: "Замена стекла" },
    { key: "battery", label: "Замена аккумулятора" },
    { key: "back", label: "Замена задней крышки / корпуса" },
    { key: "charge_port", label: "Не заряжается / разъём зарядки" },
    { key: "camera", label: "Ремонт / замена камеры" },
    { key: "faceid", label: "Face ID / Touch ID, датчики" },
    { key: "audio", label: "Динамик, микрофон, звук" },
    { key: "water", label: "Попадание влаги" },
    { key: "no_power", label: "Не включается" },
    { key: "buttons", label: "Кнопки (звук, питание)" },
    { key: "board", label: "Ремонт материнской платы" },
    { key: "other", label: "Другая проблема" },
  ],
  ipad: [
    { key: "screen", label: "Замена дисплея" },
    { key: "glass", label: "Замена стекла (тачскрина)" },
    { key: "battery", label: "Замена аккумулятора" },
    { key: "charge_port", label: "Не заряжается / разъём зарядки" },
    { key: "button", label: "Кнопки / Home / Touch ID" },
    { key: "camera", label: "Ремонт / замена камеры" },
    { key: "audio", label: "Динамик, микрофон" },
    { key: "water", label: "Попадание влаги" },
    { key: "no_power", label: "Не включается" },
    { key: "board", label: "Ремонт материнской платы" },
    { key: "other", label: "Другая проблема" },
  ],
  mac: [
    { key: "screen", label: "Замена матрицы / экрана" },
    { key: "keyboard", label: "Замена клавиатуры" },
    { key: "trackpad", label: "Замена тачпада" },
    { key: "battery", label: "Замена аккумулятора" },
    { key: "board", label: "Ремонт материнской платы" },
    { key: "ssd", label: "Замена / увеличение SSD" },
    { key: "water", label: "Залитие жидкостью" },
    { key: "cooling", label: "Чистка от пыли, термопаста" },
    { key: "ports", label: "Разъёмы (USB-C, зарядка)" },
    { key: "no_power", label: "Не включается" },
    { key: "software", label: "macOS / ПО / переустановка" },
    { key: "other", label: "Другая проблема" },
  ],
  watch: [
    { key: "glass", label: "Замена стекла" },
    { key: "screen", label: "Замена дисплея" },
    { key: "battery", label: "Замена аккумулятора" },
    { key: "crown", label: "Кнопка / колёсико Digital Crown" },
    { key: "side_button", label: "Боковая кнопка" },
    { key: "strap", label: "Ремешок / крепление" },
    { key: "back", label: "Задняя крышка / датчики" },
    { key: "water", label: "Попадание влаги" },
    { key: "no_power", label: "Не включается / не заряжается" },
    { key: "other", label: "Другая проблема" },
  ],
  airpods: [
    { key: "cleaning", label: "Чистка наушников и кейса" },
    { key: "one_side", label: "Один наушник не работает" },
    { key: "no_charge", label: "Не заряжаются / замена кейса" },
    { key: "battery", label: "Быстро садятся / замена аккумулятора" },
    { key: "sound", label: "Тихий звук / нет звука" },
    { key: "mic", label: "Не работает микрофон" },
    { key: "water", label: "Попадание влаги" },
    { key: "tips", label: "Замена амбушюр (Pro)" },
    { key: "other", label: "Другая проблема" },
  ],
  phone: [
    { key: "screen", label: "Замена экрана / дисплея" },
    { key: "glass", label: "Замена стекла" },
    { key: "battery", label: "Замена аккумулятора" },
    { key: "charge_port", label: "Не заряжается / разъём зарядки" },
    { key: "camera", label: "Ремонт / замена камеры" },
    { key: "audio", label: "Динамик, микрофон, звук" },
    { key: "water", label: "Попадание влаги" },
    { key: "no_power", label: "Не включается" },
    { key: "buttons", label: "Кнопки" },
    { key: "board", label: "Ремонт платы" },
    { key: "software", label: "Прошивка / ПО" },
    { key: "other", label: "Другая проблема" },
  ],
  other: [
    { key: "no_power", label: "Не включается" },
    { key: "imac_screen", label: "Экран / матрица (iMac)" },
    { key: "ssd", label: "Замена / увеличение диска (SSD)" },
    { key: "board", label: "Ремонт материнской платы" },
    { key: "cooling", label: "Чистка от пыли, термопаста" },
    { key: "ports", label: "Разъёмы, питание" },
    { key: "audio", label: "Звук / динамики" },
    { key: "water", label: "Попадание влаги" },
    { key: "software", label: "ПО / прошивка / настройка" },
    { key: "other", label: "Другая проблема" },
  ],
};

export function issuesFor(category: DeviceCategoryKey): RepairIssue[] {
  return ISSUES_BY_CATEGORY[category] ?? ISSUES_BY_CATEGORY.other;
}

export function issueLabel(category: DeviceCategoryKey, key: string): string {
  return issuesFor(category).find((i) => i.key === key)?.label ?? key;
}
