import type { CategorySlug } from "@/lib/data/products";

/**
 * Filter facets supported by the catalog. Each category opts into the facets
 * that make sense for it. When admin later adds new categories, they'll just
 * pick from this set (or extend it once per facet).
 */
export type FilterFacet =
  | "model"
  | "memory"
  | "color"
  | "sim"
  | "condition"
  | "battery";

export type SortKey =
  | "popular"
  | "price-asc"
  | "price-desc"
  | "new"
  | "battery-desc";

/**
 * Long-form SEO description block, rendered under the product grid.
 * Future admin panel will let store managers edit these per category.
 *
 * Either `paragraphs` (plain text array) OR `html` (rich markup from admin
 * editor, e.g. converted markdown) can be used. `html` is rendered into a
 * `prose` container, so it supports headings, lists, tables, links, etc.
 */
export type SeoBlock = {
  heading?: string;
  paragraphs?: string[];
  html?: string;
};

export type CategoryConfig = {
  slug: CategorySlug;
  title: string;
  description: string;
  /** All facets shown inside the full-filter drawer. */
  facets: FilterFacet[];
  /** Subset of facets surfaced in the sticky quick-filter bar. */
  quickFacets: FilterFacet[];
  /** Sort options exposed for this category. */
  sortOptions: SortKey[];
  /** Optional SEO content block displayed beneath pagination. */
  seo?: SeoBlock[];
};

export const SORT_LABELS: Record<SortKey, string> = {
  popular: "По популярности",
  "price-asc": "Сначала дешевле",
  "price-desc": "Сначала дороже",
  new: "Сначала новинки",
  "battery-desc": "Аккумулятор: лучший",
};

export const FACET_LABELS: Record<FilterFacet, string> = {
  model: "Модель",
  memory: "Память",
  color: "Цвет",
  sim: "SIM-карта",
  condition: "Состояние",
  battery: "Аккумулятор",
};

const COMMON_QUICK_FACETS: FilterFacet[] = ["color"];
const COMMON_SORT: SortKey[] = ["popular", "price-asc", "price-desc", "new"];

export const CATEGORY_CONFIGS: Record<CategorySlug, CategoryConfig> = {
  iphone: {
    slug: "iphone",
    title: "iPhone",
    description:
      "Новые и Б/У iPhone с гарантией PhoneTrade. Trade-in вашего старого устройства принимаем сразу.",
    facets: ["model", "memory", "color", "sim", "condition"],
    quickFacets: ["color", "memory"],
    sortOptions: COMMON_SORT,
    seo: [
      {
        heading: "Купить iPhone в Белгороде",
        paragraphs: [
          "В каталоге PhoneTrade представлены все актуальные модели iPhone: серия 17 (включая Pro Max и сверхтонкий iPhone Air), iPhone 16 и 16 Pro, а также проверенные Б/У позиции прошлых поколений. Каждый аппарат проходит проверку перед продажей — серийный номер сверяется с базой Apple, экран и аккумулятор тестируются нашими мастерами.",
          "Цены указаны в двух колонках: «Наличные» — со скидкой за оплату наличными или картой Сбербанка по СБП; «Картой» — стандартная цена при оплате по терминалу. У нас можно купить iPhone в кредит, оформить рассрочку 0-0-24 и использовать сертификат Trade-in за ваше старое устройство.",
        ],
      },
      {
        heading: "Чем модели iPhone отличаются друг от друга",
        paragraphs: [
          "iPhone Air — самый тонкий смартфон Apple за всю историю, с титановым корпусом и одним основным модулем камеры. Подойдёт тем, кто ценит лёгкость и не нуждается в Pro-камере.",
          "iPhone 17 и 17 Pro Max — флагманы 2026 года. Новая система камер, цельный дизайн с camera plateau, чип A19 Pro и улучшенный аккумулятор. Pro Max — самый большой экран и максимальная автономность.",
          "Б/У iPhone Xr и других прошлых линеек — рабочий вариант для тех, кому нужен надёжный iPhone по бюджетной цене. На все Б/У позиции даём магазинную гарантию.",
        ],
      },
      {
        heading: "Доставка и оплата в Белгороде",
        paragraphs: [
          "Самовывоз — Универмаг Белгород, 1 этаж, ул. Попова, 36. Доставка курьером по Белгороду — в день обращения. Оплата наличными, картой, по СБП или в кредит/рассрочку через банки-партнёры. Менеджер настроит Apple ID и перенесёт ваши данные бесплатно при покупке.",
        ],
      },
    ],
  },
  ipad: {
    slug: "ipad",
    title: "iPad",
    description:
      "iPad всех серий — от базового до Pro M4. Подбираем под рабочие задачи и учёбу.",
    facets: ["model", "memory", "color"],
    quickFacets: COMMON_QUICK_FACETS,
    sortOptions: COMMON_SORT,
    seo: [
      {
        heading: "Купить iPad в Белгороде",
        paragraphs: [
          "В PhoneTrade в наличии iPad всех актуальных линеек: базовый iPad для учёбы и медиа, iPad Air на чипах M-серии для творчества, и iPad Pro M5 — профессиональный планшет для дизайна, видеомонтажа и работы с 3D. К каждой модели подбираем Apple Pencil Pro и Magic Keyboard.",
          "Перед выдачей мастер проверяет экран, батарею и порты. Оригинальность подтверждаем серийным номером в базе Apple прямо при вас.",
        ],
      },
      {
        heading: "Как выбрать iPad под задачу",
        paragraphs: [
          "iPad (базовый) — учёба, чтение, видеосвязь. Лучший выбор для школьника или студента.",
          "iPad Air — работа с графикой, дизайн, заметки от руки с Apple Pencil. Достаточный запас производительности для большинства приложений.",
          "iPad Pro — профессиональные задачи: видеомонтаж в LumaFusion, 3D в Nomad Sculpt, музыка в Logic Pro. ProMotion-дисплей и чип M5.",
        ],
      },
    ],
  },
  mac: {
    slug: "mac",
    title: "Mac",
    description:
      "MacBook Air, Pro, Mac mini и iMac на Apple Silicon. Конфигурации в наличии.",
    facets: ["model", "memory", "color"],
    quickFacets: COMMON_QUICK_FACETS,
    sortOptions: COMMON_SORT,
    seo: [
      {
        heading: "Купить MacBook и Mac в Белгороде",
        paragraphs: [
          "Каталог PhoneTrade включает MacBook Air и MacBook Pro на чипах M-серии, компактный Mac mini для дома и студии, а также под заказ — iMac и Mac Studio. Подбираем конфигурацию по объёму памяти и SSD под ваши задачи.",
          "Все Mac в наличии — официальные европейские и американские версии с поддержкой macOS на русском языке. Помогаем с активацией, переносом данных с Windows-ПК или старого Mac и настройкой Apple ID.",
        ],
      },
      {
        heading: "Гарантия и сервис",
        paragraphs: [
          "На новые Mac действует годовая гарантия производителя. Дополнительно подключаем AppleCare+ — расширенная гарантия с покрытием случайных повреждений. В нашем сервисном центре в Белгороде делаем диагностику, чистку клавиатуры и замену аккумулятора.",
        ],
      },
    ],
  },
  watch: {
    slug: "watch",
    title: "Apple Watch",
    description:
      "Apple Watch Series, SE и Ultra. Любой размер корпуса и ремешок.",
    facets: ["model", "color"],
    quickFacets: COMMON_QUICK_FACETS,
    sortOptions: COMMON_SORT,
    seo: [
      {
        heading: "Купить Apple Watch в Белгороде",
        paragraphs: [
          "PhoneTrade поставляет Apple Watch Series, SE и Ultra напрямую от поставщиков. Все модели — с гарантией продавца, в комплекте оригинальная зарядка и ремешок выбранного цвета. Дополнительные ремешки и аксессуары для часов — в категории «Аксессуары».",
          "Помогаем настроить часы, привязать к iPhone, активировать функции ЭКГ и SpO2. Для Ultra-серии — настройка спортивных и трекинговых режимов.",
        ],
      },
    ],
  },
  airpods: {
    slug: "airpods",
    title: "AirPods",
    description: "AirPods 4, Pro и Max — оригинальные, с гарантией продавца.",
    facets: ["model", "color"],
    quickFacets: COMMON_QUICK_FACETS,
    sortOptions: COMMON_SORT,
    seo: [
      {
        heading: "Купить AirPods в Белгороде",
        paragraphs: [
          "В наличии AirPods 4 (базовая модель и с активным шумоподавлением), AirPods Pro 3 с адаптивным шумоподавлением и пространственным звуком, а также накладные AirPods Max в USB-C версии. Все наушники — оригинальные, со встроенным чипом H2 и поддержкой проверки в приложении «Найти».",
          "Перед продажей проверяем кейс, синхронизацию с iPhone и качество звука. По гарантии меняем дефектные экземпляры в день обращения.",
        ],
      },
    ],
  },
  accessories: {
    slug: "accessories",
    title: "Аксессуары",
    description:
      "Чехлы, кабели, зарядки, адаптеры — оригинальные и проверенные аналоги.",
    facets: ["model", "color"],
    quickFacets: COMMON_QUICK_FACETS,
    sortOptions: COMMON_SORT,
    seo: [
      {
        heading: "Аксессуары для техники Apple",
        paragraphs: [
          "Чехлы FineWoven и силиконовые, защитные стёкла, оригинальные кабели USB-C и MagSafe, адаптеры питания, AirTag, ремешки для Apple Watch — всё в одном месте. Подбираем аксессуары под вашу модель iPhone, iPad или Mac прямо в магазине.",
          "Только проверенные бренды и оригинальная продукция Apple. Никаких подделок и низкокачественных копий.",
        ],
      },
    ],
  },
  "trade-in": {
    slug: "trade-in",
    title: "Trade-in",
    description: "Сдайте старое устройство Apple и получите скидку на новое.",
    facets: [],
    quickFacets: [],
    sortOptions: [],
  },
  used: {
    slug: "used",
    title: "Б/У техника",
    description:
      "Проверенные Б/У устройства Apple с магазинной гарантией PhoneTrade.",
    facets: ["model", "memory", "color", "condition", "battery"],
    quickFacets: ["color", "battery"],
    sortOptions: [...COMMON_SORT, "battery-desc"],
    seo: [
      {
        heading: "Б/У техника Apple с гарантией PhoneTrade",
        paragraphs: [
          "Все Б/У устройства проходят полную диагностику: проверяем экран на битые пиксели, корпус на сколы, аккумулятор на ёмкость (от 80% и выше), все порты и кнопки. На каждой карточке указано состояние и процент заряда аккумулятора.",
          "На Б/У технику даём магазинную гарантию с возможностью обмена и сервисной поддержки. Если что-то пошло не так в течение гарантийного срока — заменим устройство или вернём деньги.",
        ],
      },
      {
        heading: "Почему Б/У — это разумно",
        paragraphs: [
          "Apple-устройства легко переживают первого владельца. iPhone Xr и iPhone 11 до сих пор спокойно тянут iOS 18 и все актуальные приложения. Если бюджет ограничен — Б/У позволяет получить настоящий Apple дешевле, чем китайский флагман.",
          "Для тех, кто меняет iPhone каждый год — Trade-in: сдайте старое устройство, и его сумма уйдёт в счёт нового. Принимаем iPhone, iPad, Mac, Watch и AirPods.",
        ],
      },
    ],
  },
};

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIGS[slug as CategorySlug];
}

/**
 * Конфиг по умолчанию для произвольной категории из админки (нет хардкода).
 * Фасеты подставляются из настроек категории (available_filters) на уровне страницы.
 */
export function defaultCategoryConfig(
  slug: string,
  title: string,
  description?: string
): CategoryConfig {
  return {
    slug: slug as CategorySlug,
    title,
    description: description || `${title} — с гарантией PhoneTrade в Белгороде.`,
    facets: [],
    quickFacets: [],
    sortOptions: COMMON_SORT,
  };
}

export const VALID_CATEGORY_SLUGS = Object.keys(
  CATEGORY_CONFIGS
) as CategorySlug[];
