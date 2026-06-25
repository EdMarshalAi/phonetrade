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

export interface DeviceModelGroup {
  title: string;
  models: string[];
}

export interface DeviceCategory {
  key: DeviceCategoryKey;
  title: string;
  freeInput?: boolean;
  /** Для iPhone: выбор в два шага (серия → модель). */
  series?: PhoneSeries[];
  /** Сгруппированные модели (iPad) — плитки без фото, по линейкам. */
  groups?: DeviceModelGroup[];
  /** Для остальных типов: плоский список моделей. */
  models?: string[];
  /** Кнопка «другие модели» → ручной ввод модели (с картинкой-подсказкой). */
  manual?: { label: string; hint: string; image?: string };
  /** Поле «точная модель» на шаге «что чинить» (например для Android). */
  exactModel?: { label: string; placeholder: string };
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
  { key: "11", title: "iPhone 11", cover: "iPhone 11", models: ["iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11"] },
  { key: "x", title: "iPhone X / XR / XS", cover: "iPhone XR", models: ["iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X"] },
  { key: "se", title: "iPhone SE", cover: "iPhone SE (2022)", models: ["iPhone SE (2022)", "iPhone SE (2020)"] },
  { key: "8", title: "iPhone 8", cover: "iPhone 8", models: ["iPhone 8 Plus", "iPhone 8"] },
];

export const DEVICE_CATEGORIES: DeviceCategory[] = [
  {
    key: "iphone",
    title: "iPhone",
    // Весь модельный ряд сразу (плоско), от новых к старым. Без SE и 8 (по требованию).
    models: [
      "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17", "iPhone 17e", "iPhone Air",
      "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e",
      "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
      "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
      "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
      "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
      "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
      "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
    ],
  },
  {
    key: "ipad",
    title: "iPad",
    // Плитки без фото, сгруппированы по линейкам — весь модельный ряд.
    groups: [
      { title: "iPad mini", models: ["iPad mini 4", "iPad mini 5", "iPad mini 6", "iPad mini 7"] },
      { title: "iPad Air", models: ["iPad Air", "iPad Air 2", "iPad Air 3 (2019)", "iPad Air 4 (2020)", "iPad Air 5 (2022)", "iPad Air 11″ M2 (2024)", "iPad Air 11″ M3 (2025)"] },
      { title: "iPad Pro 11″ и компактнее", models: ["iPad Pro 9.7″", "iPad Pro 10.5″", "iPad Pro 11″ (2018)", "iPad Pro 11″ (2020)", "iPad Pro 11″ (2021)", "iPad Pro 11″ (2022)", "iPad Pro 11″ M4 (2024)", "iPad Pro 11″ M5 (2025)"] },
      { title: "iPad Pro 12.9″ / 13″", models: ["iPad Pro 12.9″ (1 ген, 2015)", "iPad Pro 12.9″ (2 ген, 2017)", "iPad Pro 12.9″ (3 ген, 2018)", "iPad Pro 12.9″ (4 ген, 2020)", "iPad Pro 12.9″ (5 ген, 2021)", "iPad Pro 12.9″ (6 ген, 2022)", "iPad Pro 13″ M4 (2024)", "iPad Pro 13″ M5 (2025)"] },
      { title: "iPad (базовый)", models: ["iPad 5 (2017)", "iPad 6 (2018)", "iPad 7 (2019)", "iPad 8 (2020)", "iPad 9 (2021)", "iPad 10 (2022)", "iPad 11 A16 (2025)"] },
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
    manual: {
      label: "Другие модели",
      hint: "Впишите модель своего MacBook с крышки",
      image: "https://giwehapapi.beget.app/storage/v1/object/public/product-images/repair/macbook-model-help.jpg",
    },
  },
  {
    key: "watch",
    title: "Apple Watch",
    models: [
      "Apple Watch Ultra 2", "Apple Watch Ultra",
      "Apple Watch Series 10", "Apple Watch Series 9", "Apple Watch Series 8", "Apple Watch Series 7",
      "Apple Watch Series 6", "Apple Watch Series 5", "Apple Watch Series 4", "Apple Watch Series 3",
      "Apple Watch SE 3", "Apple Watch SE 2", "Apple Watch SE",
    ],
  },
  {
    key: "airpods",
    title: "AirPods",
    models: ["AirPods Max"],
  },
  {
    key: "phone",
    title: "Android",
    freeInput: true,
    models: ["Samsung", "Xiaomi", "Honor", "Huawei", "Realme", "OPPO", "vivo", "Google Pixel", "OnePlus", "Tecno", "Другой смартфон"],
    exactModel: { label: "Точная модель", placeholder: "например, Samsung S25" },
  },
  {
    key: "other",
    title: "Другое",
    freeInput: true,
    models: ["iMac", "Mac mini", "Mac Studio", "Mac Pro", "Apple TV", "HomePod", "Другое устройство Apple"],
  },
];

/** Фото устройств (модель → URL). Берём из НАШЕГО каталога (Storage) — единый
 *  источник, чистые курированные фото на белом. Модели, которых нет в каталоге
 *  (часть старых iPhone, прочие бренды, десктопы), показывают иконку-заглушку. */
const P = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/imported/";
const R = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/repair/other/";
const W = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/repair/watch/";
export const DEVICE_IMAGES: Record<string, string> = {
  // iPhone (новые)
  "iPhone 17 Pro Max": P + "iphone-17-pro-max-1tb-silver-dual-sim-1tb.jpg",
  "iPhone 17 Pro": P + "iphone-17-pro-512gb-blue-dual-sim-512gb.jpg",
  "iPhone 17": P + "iphone-17-256gb-lavender-256gb.jpg",
  "iPhone Air": P + "iphone-air-256gb-gold-esim-256gb.jpg",
  "iPhone 16": P + "iphone-16-128gb-white-128gb.jpg",
  "iPhone 16e": P + "iphone-16e-128gb-white-128gb.jpg",
  "iPhone 15": P + "iphone-15-128gb-black-128gb.jpg",
  "iPhone 14": P + "iphone-14-128gb-midnight-128gb.jpg",
  "iPhone 13": P + "iphone-13-128gb-starlight-128gb.jpg",
  // iPhone (из Б/У каталога)
  "iPhone 16 Pro Max": P + "USED-IP16PROMAX-WHI-256-01.jpg",
  "iPhone 15 Pro Max": P + "USED-IP15PROMAX-XXX-256-01.jpg",
  "iPhone 15 Pro": P + "USED-IP15PROU-XXX-256-01.jpg",
  "iPhone 14 Pro Max": P + "USED-IP14PROMAX-BLA-256-01.jpg",
  "iPhone 14 Pro": P + "USED-IP14PROU-XXX-128-01.jpg",
  "iPhone 14 Plus": P + "USED-IP14PLUSU-BLA-128-01.jpg",
  "iPhone 13 Pro Max": P + "USED-IP13PROMAX-BLA-1024-01.jpg",
  "iPhone 13 Pro": P + "USED-IP13PROU-BLA-128-03.jpg",
  "iPhone 12 Pro Max": P + "USED-IP12PROMAX-BLU-128-01.jpg",
  "iPhone 12 Pro": P + "USED-IP12PROU-BLA-128-01.jpg",
  "iPhone 12": P + "USED-IP12U-WHI-64-02.jpg",
  "iPhone 11": P + "USED-IP11U-BLA-128-01.jpg",
  "iPhone XR": P + "USED-IPXRU-WHI-64-02.jpg",
  // iPad
  "iPad Pro 13 (M4)": P + "apple-ipad-pro-13-m5-2025-wi-fi-256gb-space-black.jpg",
  "iPad Pro 12.9": P + "apple-ipad-pro-13-m5-2025-wi-fi-256gb-space-black.jpg",
  "iPad Pro 11 (M4)": P + "apple-ipad-pro-11-m5-256-wifi-2025-space-black-wi-fi.jpg",
  "iPad Pro 11": P + "apple-ipad-pro-11-m5-256-wifi-2025-space-black-wi-fi.jpg",
  "iPad Air 13 (M2)": P + "apple-ipad-air-11-m3-2024-wi-fi-256gb-space-gray.jpg",
  "iPad Air 11 (M2)": P + "apple-ipad-air-11-m3-2024-wi-fi-256gb-space-gray.jpg",
  "iPad Air (M1)": P + "apple-ipad-air-5-m1-109-2022-wi-fi-64gb-blue.jpg",
  "iPad Air": P + "apple-ipad-air-5-m1-109-2022-wi-fi-64gb-blue.jpg",
  "iPad 11 (A16)": P + "ipad-11-a16-2025-128gb-pink-wi-fi.jpg",
  "iPad 10.9": P + "ipad-11-a16-2025-128gb-pink-wi-fi.jpg",
  "iPad 10.2": P + "apple-ipad-102-wi-fi-64gb-space-grey.jpg",
  "iPad mini 7": P + "ipad-mini-7-a17-2024-256gb-purple-wi-fi.jpg",
  "iPad mini": P + "ipad-mini-7-a17-2024-256gb-purple-wi-fi.jpg",
  // Mac (общий вид Air/Pro)
  "MacBook Air 15 (M4)": P + "apple-macbook-air-13-m416256-starlight.jpg",
  "MacBook Air 13 (M4)": P + "apple-macbook-air-13-m416256-starlight.jpg",
  "MacBook Air 15 (M3)": P + "apple-macbook-air-13-m416256-starlight.jpg",
  "MacBook Air 13 (M3)": P + "apple-macbook-air-13-m416256-starlight.jpg",
  "MacBook Air (M2)": P + "apple-macbook-air-13-m416256-starlight.jpg",
  "MacBook Air (M1)": P + "apple-macbook-air-13-m416256-starlight.jpg",
  "MacBook Pro 16 (M4)": P + "macbook-pro-16-m4-pro-2024-24512-space-black.jpg",
  "MacBook Pro 14 (M4)": P + "macbook-pro-16-m4-pro-2024-24512-space-black.jpg",
  "MacBook Pro 16 (M3)": P + "macbook-pro-16-m4-pro-2024-24512-space-black.jpg",
  "MacBook Pro 14 (M3)": P + "macbook-pro-16-m4-pro-2024-24512-space-black.jpg",
  "MacBook Pro 13 (M2)": P + "macbook-pro-16-m4-pro-2024-24512-space-black.jpg",
  "MacBook Pro 13 (M1)": P + "macbook-pro-16-m4-pro-2024-24512-space-black.jpg",
  // Apple Watch — по-модельные фото (Storage repair/watch/)
  "Apple Watch Ultra 2": W + "apple-watch-ultra-2.jpg",
  "Apple Watch Ultra": W + "apple-watch-ultra.jpg",
  "Apple Watch Series 10": W + "apple-watch-series-10.jpg",
  "Apple Watch Series 9": W + "apple-watch-series-9.jpg",
  "Apple Watch Series 8": W + "apple-watch-series-8.jpg",
  "Apple Watch Series 7": W + "apple-watch-series-7.jpg",
  "Apple Watch Series 6": W + "apple-watch-series-6.jpg",
  "Apple Watch Series 5": W + "apple-watch-series-5.jpg",
  "Apple Watch Series 4": W + "apple-watch-series-4.jpg",
  "Apple Watch Series 3": W + "apple-watch-series-4.jpg",
  "Apple Watch SE 3": W + "apple-watch-se-2022.jpg",
  "Apple Watch SE 2": W + "apple-watch-se-2022.jpg",
  "Apple Watch SE": W + "apple-watch-se.jpg",
  // AirPods
  "AirPods Pro 2": P + "AP-WHI-01.jpg",
  "AirPods Pro": P + "AP-WHI-03.jpg",
  "AirPods 4": P + "AP-WHI-01.jpg",
  "AirPods 3": P + "AP-WHI-05.jpg",
  "AirPods 2": P + "AP-WHI-01.jpg",
  "AirPods": P + "AP-WHI-01.jpg",
  "AirPods Max": P + "AP-BLA-01.jpg",
  // Другой смартфон (бренды)
  "Samsung": P + "samsung-s25-ultra-12256-black-256gb.jpg",
  "Xiaomi": R + "xiaomi.jpg",
  "Honor": R + "honor.jpg",
  "Huawei": R + "huawei.jpg",
  "Realme": R + "realme.jpg",
  "OPPO": R + "oppo.jpg",
  "vivo": R + "vivo.jpg",
  "Google Pixel": R + "google-pixel.jpg",
  "OnePlus": R + "oneplus.jpg",
  "Tecno": R + "tecno.jpg",
  // Другое (десктопы и прочее)
  "iMac": R + "imac.jpg",
  "Mac mini": R + "mac-mini.jpg",
  "Mac Studio": R + "mac-studio.jpg",
  "Mac Pro": R + "mac-pro.jpg",
  "Apple TV": R + "apple-tv.jpg",
  "HomePod": R + "homepod.jpg",
};

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
