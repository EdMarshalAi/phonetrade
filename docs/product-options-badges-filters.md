# Опции, бейджи и фильтры товаров (admin-managed)

Дизайн-документ. Источник истины по фичe «настройки товаров → опции/бейджи»,
управляемые фильтры категорий и единый рендер бейджей на витрине.

## Understanding
- Глобальный реестр в `shop_settings`: **опции** (типы характеристик-фильтров со
  справочником значений) и **бейджи** (с цветом фона/текста и подсказкой).
- В карточке товара (админка) — таб «Опции и Бейджи»: значения опций из справочника
  + несколько бейджей.
- В категории (админка) — таб «Фильтры» (перед SEO): какие фильтры показывать в
  этой категории (опции + Модель; Цена всегда видна).
- На витрине бейджи рендерятся одинаково в карточках (главная/каталог) и на странице
  товара: слева, с подсказкой при наведении.

## Решения (Decision Log)
- **Реестр в `shop_settings`** (ключи `product_options`, `product_badges`), как
  `home_blocks`. Альт.: отдельные таблицы — отклонено (YAGNI, лишний DDL).
- **Базовые опции (Цвет/Память/SIM/Состояние) маппятся на существующие колонки**
  `products.color/memory/sim/condition`; справочник значений сидится из текущих
  distinct-значений → нулевой риск миграции данных. Кастомные опции (если добавят)
  хранятся в `products.options jsonb`. Альт.: всё в generic key-value — отклонено.
- **Несколько бейджей** через `products.badges jsonb` (массив ключей). Старое
  одиночное поле `badge` и `is_new` бэкфилл-ятся в него; `is_new` остаётся только для
  сортировки «Сначала новинки».
- **Фильтры категории** в существующей колонке `categories.available_filters jsonb`
  (массив ключей). Пусто → фолбэк на код-конфиг `category-config.ts` (без поломок).
- **Единый рендер бейджей** — компонент `ProductBadges`, используется и в `ProductCard`,
  и в `ProductGallery`. Убирает расхождение «на странице товара бейджи другие».

## Модель данных
`shop_settings.product_options` = `[{ key, label, field|null, values: string[], sort }]`
`shop_settings.product_badges` = `[{ key, label, bg, fg, tooltip, sort }]`
`products.badges jsonb` = `["new","no-rustore", …]`
`products.options jsonb` = `{ "<customKey>": "value" }`
`categories.available_filters jsonb` = `["color","memory","sim","condition","model"]`

## Сид
- options: color/memory/sim/condition со значениями из distinct.
- badges: `new` (Новинка), `no-rustore` (Без RuStore, tooltip), `in-stock` (В наличии),
  `check-availability` (Уточняйте наличие).
- backfill `products.badges`: is_new→`new`; badge-строки→соответствующие ключи.

## Витрина
- `ProductBadges` резолвит ключи из реестра → label/bg/fg/tooltip, слева, через `InfoBadge`.
- `ProductCard` и `ProductGallery` используют его; «Новинка» справа и отдельный бейдж в
  `ProductBuyPanel` убираются.
- Значения фильтров по-прежнему считаются динамически; реестр задаёт допустимый набор и порядок.

## Админка
- Товары → кнопка «Настройки» → `/admin/catalog/products/settings` (табы Опции/Бейджики).
- Карточка товара → таб «Опции и Бейджи».
- Категория → таб «Фильтры» (перед SEO).
