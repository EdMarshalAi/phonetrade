export type CategorySlug =
  | "iphone"
  | "ipad"
  | "mac"
  | "watch"
  | "airpods"
  | "accessories"
  | "trade-in"
  | "used";

export type Category = {
  id: string;
  slug: CategorySlug;
  title: string;
  image: string;
  subtitle?: string;
  /** Родительская категория (для двухуровневого каталога). null/undefined = верхний уровень. */
  parentSlug?: string | null;
};

export type Sim = "eSIM" | "Dual SIM" | "eSIM + SIM" | "nano-SIM";

export type ProductSpec = {
  label: string;
  value: string;
};

export type ProductDescription = {
  heading?: string;
  paragraphs?: string[];
  html?: string;
};

export type Product = {
  id: string;
  title: string;
  categorySlug: CategorySlug;
  model: string;
  color: string;
  memory?: string;
  sim?: Sim;
  image: string;
  /** Доп. фото товара БЕЗ главного — `image` подставляется первым автоматически
   *  (см. productImages()). Дубли главного в галерее убираются. */
  gallery?: string[];
  /** Technical specifications for the product page summary. */
  specs?: ProductSpec[];
  /** Long-form SEO description; rendered under related products. */
  description?: ProductDescription[];
  /** Short USP/highlight bullets shown right under the price. */
  highlights?: string[];
  priceCash: number;
  priceCard: number;
  /** Старая цена для зачёркивания (акция). Показывается, если > priceCash. */
  priceOld?: number;
  /** Платёж в кредит, ₽/мес (вводится в админке). Показывается единой строкой. */
  installmentFrom?: number;
  /** Партнёр/условие кредита (напр. «0-0-24»). */
  installmentPartner?: string;
  /** Остаток на складе. null = «уточняйте». 0 = нет в наличии. */
  stock?: number;
  isAvailable?: boolean;
  /** Сопутствующие товары (ID), заданные в админке. */
  relatedProductIds?: string[];
  /** Группа «Связанные товары» (варианты цвет/память). Общий id у всех вариантов. */
  variantGroupId?: string | null;
  /** Подробное описание (HTML), на странице товара после сопутствующих. */
  descriptionHtml?: string;
  /** Устаревшее одиночное поле бейджа (оставлено для обратной совместимости). */
  badge?: string;
  /** Ключи бейджей из реестра (shop_settings.product_badges) — может быть несколько. */
  badges?: string[];
  /** Значения кастомных опций (базовые color/memory/sim/condition — в своих полях). */
  options?: Record<string, string>;
  condition?: string;
  battery?: number;
  isUsed?: boolean;
  isNew?: boolean;
  rating?: number;
  inStock?: boolean;
};

export const CATEGORIES: Category[] = [
  {
    id: "cat-iphone",
    slug: "iphone",
    title: "iPhone",
    image: "/categories/iphone-cutout.png",
    subtitle: "Новинки серии 17 и iPhone Air",
  },
  {
    id: "cat-ipad",
    slug: "ipad",
    title: "iPad",
    image: "/categories/ipad-cutout.png",
    subtitle: "От базового до Pro M-серии",
  },
  {
    id: "cat-mac",
    slug: "mac",
    title: "Mac",
    image: "/categories/mac-cutout.png",
    subtitle: "MacBook Air и Pro на Apple Silicon",
  },
  {
    id: "cat-watch",
    slug: "watch",
    title: "Apple Watch",
    image: "/categories/watch-cutout.png",
    subtitle: "Series, SE и Ultra",
  },
  {
    id: "cat-airpods",
    slug: "airpods",
    title: "AirPods",
    image: "/categories/accessories-cutout.png",
    subtitle: "AirPods 4, Pro и Max",
  },
  {
    id: "cat-accessories",
    slug: "accessories",
    title: "Аксессуары",
    image: "/categories/accessories-cutout.png",
    subtitle: "Чехлы, кабели, зарядки",
  },
  {
    id: "cat-trade-in",
    slug: "trade-in",
    title: "Trade-in",
    image: "/categories/iphone-cutout.png",
    subtitle: "Сдай старое — получи скидку",
  },
];

/**
 * Master product catalog. Each product carries normalized facet values
 * (model, color, memory, sim) so filters can be derived dynamically.
 */
export const ALL_PRODUCTS: Product[] = [
  // ===== iPhone 17 base =====
  {
    id: "ip17-128-black",
    title: "iPhone 17 128GB Black",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Чёрный",
    memory: "128GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-black-1-cut.png",
    // Доп. фото (без главного — оно подставляется первым автоматически).
    gallery: [
      "/products/iphone-17-black-2-cut.png",
      "/products/iphone-17-black-3-cut.png",
    ],
    highlights: [
      "Чип A19 и Super Retina XDR с ProMotion 120 Гц",
      "Двойная камера 48 + 12 Мп с Photonic Engine",
      "До 28 часов видео и быстрая зарядка MagSafe 25 Вт",
    ],
    specs: [
      { label: "Дисплей", value: "6,3″ Super Retina XDR · ProMotion 120 Гц · 2622×1206" },
      { label: "Процессор", value: "Apple A19 · 6 ядер CPU · 5 ядер GPU" },
      { label: "Память (ОЗУ/ПЗУ)", value: "8 ГБ / 128 ГБ" },
      { label: "Основная камера", value: "48 Мп Fusion + 12 Мп Ultra Wide" },
      { label: "Фронтальная камера", value: "12 Мп TrueDepth с автофокусом" },
      { label: "Аккумулятор", value: "Li-Ion · до 28 ч видео" },
      { label: "Зарядка", value: "USB-C · MagSafe 25 Вт · Qi 15 Вт" },
      { label: "Связь", value: "5G · Wi-Fi 7 · Bluetooth 5.3 · eSIM + nano-SIM" },
      { label: "Защита", value: "IP68 (1,5 м, 30 минут)" },
      { label: "Габариты", value: "147,6 × 71,5 × 7,8 мм · 174 г" },
    ],
    description: [
      {
        heading: "iPhone 17 — без компромиссов",
        paragraphs: [
          "iPhone 17 — это новое поколение базовой модели Apple, которая в 2026 году получила технологии, ранее доступные только в Pro-серии. ProMotion 120 Гц на Super Retina XDR делает интерфейс заметно плавнее, а Always-On дисплей экономит заряд за счёт LTPO.",
          "Чип A19 быстрее предшественника на 18% по CPU и до 27% по GPU. Игры с трассировкой лучей, обработка видео в LumaFusion, локальный запуск ML-моделей — всё это становится повседневным, а не «на пределе».",
        ],
      },
      {
        heading: "Камера, которая видит как глаз",
        paragraphs: [
          "Двойная система 48 + 12 Мп с новым Photonic Engine второго поколения вытягивает детали из теней и держит цвета даже в самых сложных сценах. Ночной режим теперь работает на обеих камерах, а портретный режим автоматически добавляет глубину к любому кадру с человеком — без переключения режимов.",
          "Видео — Dolby Vision 4K при 60 fps на всех камерах, аудио — Cinematic Mode для подкастов и контента: микрофоны направленно фокусируются на говорящем.",
        ],
      },
      {
        heading: "Гарантия и сервис PhoneTrade",
        paragraphs: [
          "На iPhone 17 действует магазинная гарантия PhoneTrade 12 месяцев + гарантия Apple. По любым вопросам — заходите в наш сервис в Универмаге Белгород или звоните +7 (904) 098-88-77. Перенесём данные, активируем eSIM и настроим Apple ID бесплатно.",
        ],
      },
    ],
    priceCash: 86000,
    priceCard: 99000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-256-black",
    title: "iPhone 17 256GB Black",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Чёрный",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-black-1-cut.png",
    // Доп. фото (без главного — оно подставляется первым автоматически).
    gallery: [
      "/products/iphone-17-black-2-cut.png",
      "/products/iphone-17-black-3-cut.png",
    ],
    priceCash: 96000,
    priceCard: 110000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-512-black",
    title: "iPhone 17 512GB Black",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Чёрный",
    memory: "512GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-black-1-cut.png",
    // Доп. фото (без главного — оно подставляется первым автоматически).
    gallery: [
      "/products/iphone-17-black-2-cut.png",
      "/products/iphone-17-black-3-cut.png",
    ],
    priceCash: 114000,
    priceCard: 131000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-1tb-black",
    title: "iPhone 17 1TB Black",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Чёрный",
    memory: "1TB",
    sim: "eSIM",
    image: "/products/iphone-17-black-1-cut.png",
    // Доп. фото (без главного — оно подставляется первым автоматически).
    gallery: [
      "/products/iphone-17-black-2-cut.png",
      "/products/iphone-17-black-3-cut.png",
    ],
    priceCash: 139000,
    priceCard: 159000,
    badge: "Без RuStore",
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-256-sage",
    title: "iPhone 17 256GB Sage",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Зелёный",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-sage.png",
    priceCash: 93000,
    priceCard: 107000,
    badge: "Уточняйте наличие",
    isNew: true,
  },
  {
    id: "ip17-256-blue",
    title: "iPhone 17 256GB Lavender",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Лавандовый",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-lavender.png",
    priceCash: 94000,
    priceCard: 108000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-512-white",
    title: "iPhone 17 512GB White",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Белый",
    memory: "512GB",
    sim: "eSIM",
    image: "/products/iphone-17-white.png",
    priceCash: 109000,
    priceCard: 125000,
    badge: "Без RuStore",
    isNew: true,
    inStock: true,
  },

  // ===== iPhone 17 Pro =====
  {
    id: "ip17-pro-256-orange",
    title: "iPhone 17 Pro 256GB Cosmic Orange",
    categorySlug: "iphone",
    model: "iPhone 17 Pro",
    color: "Оранжевый",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-pro-orange.png",
    priceCash: 99000,
    priceCard: 114000,
    badge: "Уточняйте наличие",
    isNew: true,
  },
  {
    id: "ip17-pro-256-silver",
    title: "iPhone 17 Pro 256GB Silver",
    categorySlug: "iphone",
    model: "iPhone 17 Pro",
    color: "Серебристый",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-pro-silver.png",
    priceCash: 104000,
    priceCard: 120000,
    badge: "Уточняйте наличие",
    isNew: true,
  },
  {
    id: "ip17-pro-512-deep-blue",
    title: "iPhone 17 Pro 512GB Deep Blue",
    categorySlug: "iphone",
    model: "iPhone 17 Pro",
    color: "Синий",
    memory: "512GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-pro-blue.png",
    priceCash: 124000,
    priceCard: 142000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-pro-1tb-black",
    title: "iPhone 17 Pro 1TB Black",
    categorySlug: "iphone",
    model: "iPhone 17 Pro",
    color: "Чёрный",
    memory: "1TB",
    sim: "eSIM",
    image: "/products/iphone-17-pro-black.png",
    priceCash: 159000,
    priceCard: 182000,
    badge: "Без RuStore",
    isNew: true,
    inStock: true,
  },

  // ===== iPhone Air =====
  {
    id: "ip-air-256-black",
    title: "iPhone Air 256GB Black eSIM",
    categorySlug: "iphone",
    model: "iPhone Air",
    color: "Чёрный",
    memory: "256GB",
    sim: "eSIM",
    image: "/products/iphone-air-black.png",
    priceCash: 69000,
    priceCard: 79500,
    badge: "Без RuStore",
    isNew: true,
    inStock: true,
  },
  {
    id: "ip-air-256-gold",
    title: "iPhone Air 256GB Gold eSIM",
    categorySlug: "iphone",
    model: "iPhone Air",
    color: "Золотой",
    memory: "256GB",
    sim: "eSIM",
    image: "/products/iphone-air-gold.png",
    priceCash: 70000,
    priceCard: 80500,
    badge: "Без RuStore",
    isNew: true,
    inStock: true,
  },
  {
    id: "ip-air-512-cloud",
    title: "iPhone Air 512GB Cloud White",
    categorySlug: "iphone",
    model: "iPhone Air",
    color: "Белый",
    memory: "512GB",
    sim: "eSIM",
    image: "/products/iphone-air-white.png",
    priceCash: 72000,
    priceCard: 83000,
    badge: "Без RuStore",
    isNew: true,
    inStock: true,
  },
  {
    id: "ip-air-512-sky",
    title: "iPhone Air 512GB Sky Blue",
    categorySlug: "iphone",
    model: "iPhone Air",
    color: "Синий",
    memory: "512GB",
    sim: "Dual SIM",
    image: "/products/iphone-air-blue.png",
    priceCash: 75000,
    priceCard: 86000,
    badge: "Уточняйте наличие",
    isNew: true,
  },

  // ===== iPhone 16 (предыдущий год) =====
  {
    id: "ip16-128-black",
    title: "iPhone 16 128GB Black",
    categorySlug: "iphone",
    model: "iPhone 16",
    color: "Чёрный",
    memory: "128GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-16-black.png",
    priceCash: 64000,
    priceCard: 73500,
    inStock: true,
  },
  {
    id: "ip16-256-pink",
    title: "iPhone 16 256GB Pink",
    categorySlug: "iphone",
    model: "iPhone 16",
    color: "Розовый",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-16-pink.png",
    priceCash: 71000,
    priceCard: 81500,
    inStock: true,
  },
  {
    id: "ip16-pro-256-titan",
    title: "iPhone 16 Pro 256GB Natural Titanium",
    categorySlug: "iphone",
    model: "iPhone 16 Pro",
    color: "Титан",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-16-pro-titan.png",
    priceCash: 89000,
    priceCard: 102000,
    inStock: true,
  },
  {
    id: "ip16-pro-512-black",
    title: "iPhone 16 Pro 512GB Black Titanium",
    categorySlug: "iphone",
    model: "iPhone 16 Pro",
    color: "Чёрный",
    memory: "512GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-16-pro-black.png",
    priceCash: 109000,
    priceCard: 125000,
    inStock: true,
  },
  {
    id: "ip17-pro-max-256-blue",
    title: "iPhone 17 Pro Max 256GB Deep Blue",
    categorySlug: "iphone",
    model: "iPhone 17 Pro Max",
    color: "Синий",
    memory: "256GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-pro-max-blue.png",
    priceCash: 119000,
    priceCard: 137000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-pro-max-512-silver",
    title: "iPhone 17 Pro Max 512GB Silver",
    categorySlug: "iphone",
    model: "iPhone 17 Pro Max",
    color: "Серебристый",
    memory: "512GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-pro-max-silver.png",
    priceCash: 139000,
    priceCard: 159000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-pro-max-1tb-black",
    title: "iPhone 17 Pro Max 1TB Black",
    categorySlug: "iphone",
    model: "iPhone 17 Pro Max",
    color: "Чёрный",
    memory: "1TB",
    sim: "eSIM",
    image: "/products/iphone-17-pro-max-black.png",
    priceCash: 179000,
    priceCard: 205000,
    badge: "Без RuStore",
    isNew: true,
    inStock: true,
  },
  {
    id: "ip17-128-white",
    title: "iPhone 17 128GB White",
    categorySlug: "iphone",
    model: "iPhone 17",
    color: "Белый",
    memory: "128GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-17-white-128.png",
    priceCash: 88000,
    priceCard: 101000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ip16-512-blue",
    title: "iPhone 16 512GB Ultramarine",
    categorySlug: "iphone",
    model: "iPhone 16",
    color: "Синий",
    memory: "512GB",
    sim: "eSIM + SIM",
    image: "/products/iphone-16-blue.png",
    priceCash: 79000,
    priceCard: 91000,
    inStock: true,
  },
  {
    id: "ip-air-1tb-black",
    title: "iPhone Air 1TB Stealth Black",
    categorySlug: "iphone",
    model: "iPhone Air",
    color: "Чёрный",
    memory: "1TB",
    sim: "Dual SIM",
    image: "/products/iphone-air-black-1tb.png",
    priceCash: 89000,
    priceCard: 102000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ipxr-128-yellow",
    title: "iPhone Xr 128GB Yellow",
    categorySlug: "iphone",
    model: "iPhone Xr",
    color: "Жёлтый",
    memory: "128GB",
    sim: "nano-SIM",
    image: "/products/iphone-xr-yellow.png",
    priceCash: 12000,
    priceCard: 15500,
    condition: "Очень хорошее состояние, незначительные потёртости",
    battery: 91,
    isUsed: true,
    inStock: true,
  },

  // ===== Б/У iPhone Xr =====
  {
    id: "ipxr-64-black",
    title: "iPhone Xr 64GB Black",
    categorySlug: "iphone",
    model: "iPhone Xr",
    color: "Чёрный",
    memory: "64GB",
    sim: "nano-SIM",
    image: "/products/iphone-xr-black.png",
    priceCash: 7000,
    priceCard: 9100,
    condition: "Отличное состояние, в комплекте кабель",
    battery: 89,
    isUsed: true,
    inStock: true,
  },
  {
    id: "ipxr-64-white",
    title: "iPhone Xr 64GB White",
    categorySlug: "iphone",
    model: "iPhone Xr",
    color: "Белый",
    memory: "64GB",
    sim: "nano-SIM",
    image: "/products/iphone-xr-white.png",
    priceCash: 9000,
    priceCard: 11700,
    condition: "Идеальное состояние, без сколов",
    battery: 96,
    isUsed: true,
    inStock: true,
  },
  {
    id: "ipxr-64-red",
    title: "iPhone Xr 64GB (PRODUCT) RED",
    categorySlug: "iphone",
    model: "iPhone Xr",
    color: "Красный",
    memory: "64GB",
    sim: "nano-SIM",
    image: "/products/iphone-xr-red.png",
    priceCash: 10000,
    priceCard: 13000,
    condition: "Отличное состояние, родной аккумулятор",
    battery: 94,
    isUsed: true,
    inStock: true,
  },
  {
    id: "ipxr-128-blue",
    title: "iPhone Xr 128GB Blue",
    categorySlug: "iphone",
    model: "iPhone Xr",
    color: "Синий",
    memory: "128GB",
    sim: "nano-SIM",
    image: "/products/iphone-xr-blue.png",
    priceCash: 11500,
    priceCard: 14900,
    condition: "Хорошее состояние, потёртости по корпусу",
    battery: 88,
    isUsed: true,
    inStock: true,
  },

  // ===== iPad =====
  {
    id: "ipad-102-64",
    title: "iPad 10.2″ 64GB Wi-Fi",
    categorySlug: "ipad",
    model: "iPad",
    color: "Серый",
    memory: "64GB",
    image: "/products/ipad-102.png",
    priceCash: 32000,
    priceCard: 36500,
    inStock: true,
  },
  {
    id: "ipad-air-m1-256",
    title: "iPad Air 5 M1 256GB Wi-Fi",
    categorySlug: "ipad",
    model: "iPad Air",
    color: "Сиреневый",
    memory: "256GB",
    image: "/products/ipad-air-m1.png",
    priceCash: 48000,
    priceCard: 55000,
    inStock: true,
  },
  {
    id: "ipad-air-m3-128",
    title: "iPad Air M3 128GB Wi-Fi",
    categorySlug: "ipad",
    model: "iPad Air",
    color: "Серый",
    memory: "128GB",
    image: "/products/ipad-air-m3.png",
    priceCash: 56000,
    priceCard: 64000,
    isNew: true,
    inStock: true,
  },
  {
    id: "ipad-pro-m4-256",
    title: "iPad Pro M4 11″ 256GB Wi-Fi",
    categorySlug: "ipad",
    model: "iPad Pro",
    color: "Серебристый",
    memory: "256GB",
    image: "/products/ipad-pro-m4.png",
    priceCash: 98000,
    priceCard: 112000,
    isNew: true,
    inStock: true,
  },

  // ===== Mac =====
  {
    id: "mbair-m2-256",
    title: "MacBook Air 13″ M2 256GB",
    categorySlug: "mac",
    model: "MacBook Air",
    color: "Midnight",
    memory: "256GB",
    image: "/products/macbook-air-m2.png",
    priceCash: 98000,
    priceCard: 112000,
    badge: "В наличии",
    inStock: true,
  },
  {
    id: "mbair-m4-512",
    title: "MacBook Air 13″ M4 512GB",
    categorySlug: "mac",
    model: "MacBook Air",
    color: "Серебристый",
    memory: "512GB",
    image: "/products/macbook-air-m4.png",
    priceCash: 134000,
    priceCard: 153000,
    isNew: true,
    inStock: true,
  },
  {
    id: "mbpro-m4-512",
    title: "MacBook Pro 14″ M4 Pro 512GB",
    categorySlug: "mac",
    model: "MacBook Pro",
    color: "Space Black",
    memory: "512GB",
    image: "/products/macbook-pro-m4.png",
    priceCash: 198000,
    priceCard: 226000,
    isNew: true,
    inStock: true,
  },
  {
    id: "mac-mini-m4",
    title: "Mac mini M4 16/256GB",
    categorySlug: "mac",
    model: "Mac mini",
    color: "Серебристый",
    memory: "256GB",
    image: "/products/mac-mini-m4.png",
    priceCash: 67000,
    priceCard: 77000,
    isNew: true,
    inStock: true,
  },

  // ===== Apple Watch =====
  {
    id: "watch-s10-42",
    title: "Apple Watch Series 10 42mm Jet Black",
    categorySlug: "watch",
    model: "Apple Watch Series 10",
    color: "Jet Black",
    memory: "64GB",
    image: "/products/watch-s10.png",
    priceCash: 44000,
    priceCard: 50000,
    isNew: true,
    inStock: true,
  },
  {
    id: "watch-s10-46-silver",
    title: "Apple Watch Series 10 46mm Silver",
    categorySlug: "watch",
    model: "Apple Watch Series 10",
    color: "Серебристый",
    memory: "64GB",
    image: "/products/watch-s10-silver.png",
    priceCash: 48000,
    priceCard: 55000,
    isNew: true,
    inStock: true,
  },
  {
    id: "watch-ultra2",
    title: "Apple Watch Ultra 2 49mm Natural Titanium",
    categorySlug: "watch",
    model: "Apple Watch Ultra 2",
    color: "Титан",
    memory: "64GB",
    image: "/products/watch-ultra2.png",
    priceCash: 78000,
    priceCard: 89000,
    inStock: true,
  },

  // ===== AirPods =====
  {
    id: "airpods-4",
    title: "AirPods 4",
    categorySlug: "airpods",
    model: "AirPods 4",
    color: "Белый",
    image: "/products/airpods-4.png",
    priceCash: 12000,
    priceCard: 13800,
    isNew: true,
    inStock: true,
  },
  {
    id: "airpods-pro-3",
    title: "AirPods Pro 3",
    categorySlug: "airpods",
    model: "AirPods Pro",
    color: "Белый",
    image: "/products/airpods-pro-3.png",
    priceCash: 21000,
    priceCard: 24000,
    isNew: true,
    inStock: true,
  },
  {
    id: "airpods-max-usbc",
    title: "AirPods Max USB-C Midnight",
    categorySlug: "airpods",
    model: "AirPods Max",
    color: "Midnight",
    image: "/products/airpods-max.png",
    priceCash: 49000,
    priceCard: 56000,
    inStock: true,
  },
];

// ===== Convenience re-exports for the existing homepage rails =====

export const FEATURED_IPHONES: Product[] = ALL_PRODUCTS.filter(
  (p) => p.categorySlug === "iphone" && !p.isUsed
).slice(0, 4);

export const FEATURED_CATALOG: Product[] = [
  ALL_PRODUCTS.find((p) => p.categorySlug === "ipad")!,
  ALL_PRODUCTS.find((p) => p.categorySlug === "mac")!,
  ALL_PRODUCTS.find((p) => p.categorySlug === "watch")!,
  ALL_PRODUCTS.find((p) => p.categorySlug === "airpods")!,
].filter(Boolean);

export const USED_IPHONES: Product[] = ALL_PRODUCTS.filter(
  (p) => p.isUsed
).slice(0, 4);
