# PhoneTrade

Интернет-магазин техники Apple для компании **PhoneTrade** (Белгород, Универмаг Белгород, 1 этаж, ул. Попова, 36). Строгая премиальная Apple-эстетика: серо-чёрная палитра, крупная типографика, сдержанные анимации.

Сайт на русском языке, ориентирован на белгородский рынок (SEO, контактные данные, локальная доставка).

---

## Стек

| Слой | Технология |
|------|-----------|
| Framework | **Next.js 16.2.6** (App Router, Server Components, `output: "standalone"`) |
| Runtime | **React 19.2.4**, **TypeScript 5** |
| Стили | **Tailwind CSS v4** через `@theme` в `globals.css` (без `tailwind.config.js`), `@tailwindcss/typography` |
| UI-примитивы | **@base-ui-components/react** (НЕ Radix), shadcn-конфиг `components.json` (style new-york) |
| Варианты компонентов | `class-variance-authority` + `tailwind-merge` + `clsx` → утилита `cn()` |
| Иконки | `lucide-react` |
| Анимации | `motion` / `framer-motion` 12, `tw-animate-css`, кастомные `@keyframes` |

> **Важно:** это не та версия Next.js, что в обучающих данных моделей — у Next 16 есть breaking changes. Перед написанием кода читай гайды в `node_modules/next/dist/docs/`. См. `AGENTS.md`.

---

## Запуск

```bash
npm install
cp .env.example .env.local   # заполнить переменными Supabase (см. ниже)
npm run dev      # dev-сервер (Turbopack), http://localhost:3000 (или следующий свободный порт)
npm run build    # production-сборка (standalone)
npm run start    # запуск собранного приложения
npm run lint     # ESLint
npm run seed     # залить каталог из моков в Supabase (tsx scripts/seed-supabase.ts)
```

Импорты идут через алиас `@/*` → `./src/*` (см. `tsconfig.json`).

**Переменные окружения** (`.env.local`, в `.gitignore` — не коммитить):

```
NEXT_PUBLIC_SUPABASE_URL=https://giwehapapi.beget.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>     # только локально/на сервере, не NEXT_PUBLIC_
```

Без этих переменных слой данных автоматически откатывается на мок-данные — приложение работает и без Supabase.

---

## Структура проекта

```
src/
├── app/                       # App Router
│   ├── layout.tsx             # Root layout: <html lang="ru">, шрифт Inter, Header/Footer, метаданные, SEO
│   ├── globals.css            # Tailwind v4 @theme — все дизайн-токены
│   ├── page.tsx               # Главная (Server Component, параллельная загрузка данных)
│   ├── category/[slug]/page.tsx   # Каталог категории (фильтры, сортировка)
│   ├── product/[id]/page.tsx      # Карточка товара
│   └── cart/page.tsx              # Корзина и оформление заказа
│
├── components/
│   ├── layout/                # Header (многоуровневый, sticky), Footer, SearchInput
│   ├── home/                  # Секции главной (Hero, BentoCategories, ProductRail, …)
│   ├── catalog/               # Каталог: CatalogShell, фильтры, грид, SEO-блоки
│   ├── product/               # ProductCard, CategoryTile (для гридов/главной)
│   ├── product-detail/        # Страница товара: галерея, панель покупки, спеки, related
│   ├── cart/                  # Корзина: секции оформления + OrderSummary
│   ├── ui/                    # Примитивы: Button, Badge, Card, Accordion, BentoCard, …
│   └── providers/             # TooltipProvider
│
└── lib/
    ├── data/products.ts       # Типы + моковые данные (CATEGORIES, ALL_PRODUCTS)
    ├── products.ts            # Async-геттеры (слой данных — будущая замена на Supabase)
    ├── catalog/               # category-config, filters, subcategories, use-catalog-filters
    ├── cart/types.ts          # Типы корзины и оформления
    └── utils/                 # cn(), formatPrice()
```

---

## Дизайн-система

Все токены объявлены в `@theme`-блоке `src/app/globals.css` (фича Tailwind v4, без отдельного конфига).

### Цвета (Apple-палитра: серый + чёрный, без синего/градиентов)

| Токен | Значение | Назначение |
|-------|----------|-----------|
| `--color-bg` | `#ffffff` | Основной фон |
| `--color-surface` | `#f5f5f7` | Светло-серые секции/карточки (фирменный серый Apple) |
| `--color-surface-2` | `#fafafa` | Третичная поверхность |
| `--color-ink` | `#1d1d1f` | Основной текст / **чёрный акцент** (кнопки, CTA) |
| `--color-ink-muted` | `#6e6e73` | Вторичный текст |
| `--color-ink-subtle` | `#86868b` | Приглушённый текст |
| `--color-border` | `#d2d2d7` | Разделители |
| `--color-border-strong` | `#c7c7cc` | Акцентные границы |
| `--color-onDark` | `#f5f5f7` | Текст на тёмном фоне |
| `--color-onDark-muted` | `#a1a1a6` | Вторичный текст на тёмном |
| `--color-sale` | `#e30000` | **Единственный цвет** — красная цена за наличные |

### Типографика

- `--font-sans`: `-apple-system, BlinkMacSystemFont, var(--font-inter), "Helvetica Neue", "Segoe UI", Roboto, system-ui, sans-serif` — приоритет системному Apple-шрифту, **Inter** (Google, subsets `latin` + `cyrillic`) как fallback.
- Сглаживание: `-webkit-font-smoothing: antialiased`, `font-feature-settings: "ss01", "cv11"`.
- Заголовки: крупные, `font-semibold`, `tracking-tight` / отрицательный трекинг.

### Радиусы и анимации

- Радиусы: `--radius-xs:6px` … `--radius-2xl:26px`. Карточки `rounded-2xl`/`rounded-3xl`, кнопки/бейджи `rounded-full`.
- Easing: `--ease-apple: cubic-bezier(0.32, 0.72, 0, 1)`.
- Тени почти невидимые, усиливаются на hover. Все ambient-анимации уважают `prefers-reduced-motion`.
- `.container-page` — центрированный контейнер `max-width: 1280px` с адаптивными отступами.

### UI-примитивы (`src/components/ui/`)

- **Button** — CVA-варианты `primary` / `invert` / `outline` / `ghost` / `link`; размеры `sm/md/lg/xl/icon`; всегда `rounded-full`.
- **Badge** — `muted` / `dark` / `outline` / `sale`.
- **Card** — `rounded-2xl bg-white border border-border/60` + мягкая тень.
- **Accordion** — на Base UI, тёмные pill-строки (для FAQ).
- **BentoCard** — крупные карточки bento (тона `light/surface/ink`, hover-подъём).
- **InfoBadge** — бейдж с тултипом (Base UI Tooltip).
- **MotionReveal / MotionStagger** — scroll-reveal с Apple-easing.
- **ImagePlaceholder** — заглушка под изображения.

### Утилиты (`src/lib/utils/`)

- `cn(...)` — `twMerge(clsx(...))`, безопасное объединение Tailwind-классов.
- `formatPrice(n)` — `Intl.NumberFormat("ru-RU")` → например `"99 000 ₽"`.

---

## Архитектура данных

**Слой данных — через геттеры**, компоненты НЕ импортируют моки напрямую. Геттеры в `src/lib/products.ts` читают из **Supabase** через anon-клиент (`src/lib/supabase/client.ts`); при ошибке или без env-переменных откатываются на статические TS-массивы. Мок-данные (`src/lib/data/products.ts`) остаются **источником истины** — `npm run seed` заливает их в БД. Схема — `supabase/schema.sql`, маппинг строк БД (snake_case) ↔ домен (camelCase) — `src/lib/supabase/types.ts`.

`src/lib/products.ts`:

```ts
getCategories()                 // Category[]
getFeaturedIphones()            // Product[] — для главной
getFeaturedCatalog()            // Product[] — iPad/Mac/Watch
getUsedProducts()               // Product[] — Б/У
getHeroProduct()                // Product
getProductsByCategory(slug)     // Product[]
getProductById(id)              // Product | undefined
getRelatedProducts(product)     // Product[]
getVariantsForProduct(product)  // { colors, memories }
```

### Основные модели (`src/lib/data/products.ts`)

- **Product** — расширенная модель: `id`, `title`, `categorySlug`, `model`, `color`, `memory?`, `sim?`, `image`, `gallery?`, `specs?`, `description?`, `highlights?`, `priceCash`, `priceCard`, `badge?`, `condition?`, `battery?`, `isUsed?`, `isNew?`, `rating?`, `inStock?`.
- **Category** — `id`, `slug`, `title`, `image`, `subtitle?`.
- `CategorySlug` = `iphone | ipad | mac | watch | airpods | accessories | trade-in | used`.

### Каталог (`src/lib/catalog/`)

- `category-config.ts` — на категорию: фасеты, быстрые фасеты, опции сортировки, SEO-блоки.
- `filters.ts` — `extractFacetOptions()`, `applyFilters()`, `applySort()`, `countActiveFilters()`. Фасеты извлекаются из данных динамически.
- `use-catalog-filters.ts` — клиентский хук: фильтры/сортировка живут в **URL-параметрах** (shareable-ссылки). Пагинация — в локальном стейте.
- `subcategories.ts` — предрассчитанные подкатегории (модели) с количеством.

### Корзина (`src/lib/cart/types.ts`)

- `CartItem` = `{ productId, product, qty }`.
- `CheckoutState` — тип/режим клиента, контакты, доставка, оплата, согласие.
- `DeliveryMethod` = `pickup | courier`. `PaymentMethod` = `sbp | card | cash | credit`.

### Управление состоянием

Без глобальных стейт-библиотек:
- **Фильтры каталога** — URL search params (через `useCatalogFilters`).
- **Корзина и форма оформления** — локальный `useState` в `CartShell` (на данном этапе — сид-данные, без персистентности).
- **UI-состояния** (меню, дровер, индекс галереи) — локальный стейт компонентов.

---

## Страницы

| Маршрут | Файл | Назначение |
|---------|------|-----------|
| `/` | `app/page.tsx` | Главная: Hero-карусель, bento-категории, 3 продуктовых ряда, Trade-in, FAQ |
| `/category/[slug]` | `app/category/[slug]/page.tsx` | Каталог категории: фасетные фильтры, сортировка, пагинация, SEO-блоки. 404 при неизвестном slug |
| `/product/[id]` | `app/product/[id]/page.tsx` | Карточка товара: галерея, панель покупки, варианты, спеки, related, описание |
| `/cart` | `app/cart/page.tsx` | Корзина и пошаговое оформление (товары → клиент → доставка → оплата + сводка) |

Server Components по умолчанию; `"use client"` — там, где есть интерактив (`Header`, `CatalogShell`, `CartShell`, `ProductCard`, `ProductBuyPanel`). Динамические метаданные через `generateMetadata()`.

### Структура главной (сверху вниз)

`Hero` (карусель 4 слайдов) → `BentoCategories` → `ProductRail` (Новинки iPhone) → `ProductRail` (iPad, Mac, Watch) → `ProductRail` (Б/У) → `TradeInPromo` → `TradeInSteps` → `BrandMarquee` → `BlogTeaser` → `WhyAndFaq`.

---

## Статус реализации (относительно первоначального брифа)

Первоначальный промт (`phonetrade-prompt.md`) описывал **этап 1 — только главную страницу**. Проект развился значительно дальше.

### Реализовано по брифу ✅

- Стек целиком: Next 16 (standalone), React 19, TS 5, Tailwind v4 через `@theme` (без конфига), Base UI вместо Radix, `cn()`, CVA, lucide, motion + `MotionReveal`, `prefers-reduced-motion`.
- Структура папок как в брифе (`app`, `components/{layout,home,ui,product}`, `lib/{data,products.ts,utils}`).
- Серо-чёрная палитра + красная цена за наличные — **точное совпадение hex-значений**.
- Системный шрифт с Inter-fallback, крупная типографика, мягкие радиусы, едва заметные тени.
- `formatPrice()`, геттеры данных, типизированные моки.
- Все 11 секций главной (Header, Hero, категории, 3 ряда товаров, Trade-in промо + 3 шага, «Почему PhoneTrade» + FAQ-аккордеон, Footer).
- Адаптивность, семантика, доступность.

### Развилось/изменилось относительно брифа 🔁

- **Header** — вместо компактной одноуровневой тёмной шапки сделан многоуровневый: тёмная служебная панель + брендовая строка с поиском + **sticky белая панель категорий** (высота sticky-части 60px).
- **Hero** — полноценная карусель из 4 слайдов с admin-ready массивом `HERO_SLIDES` (бриф допускал один слайд + точки).
- Отдельный «промо-ряд категорий» свёрнут в навигацию хедера + `BentoCategories`.
- Добавлены секции, которых не было в брифе: **`BrandMarquee`**, **`BlogTeaser`**.
- **Изображения** — появились реальные ассеты в `/public/products` и `/public/categories` (cutout-картинки), `next/image` используется в 6 компонентах; `ImagePlaceholder` остаётся как фолбэк. (Бриф предполагал только заглушки.)
- `getFeaturedProducts()` из брифа разделён на `getFeaturedIphones()` + `getFeaturedCatalog()`; модель `Product` сильно расширена.

### Сделано сверх этапа 1 🚀

Целые разделы, которых в брифе «только главная» не было:
- **`/category/[slug]`** — каталог с фасетными фильтрами, URL-состоянием, сортировкой, пагинацией, SEO-блоками.
- **`/product/[id]`** — детальная карточка товара (галерея, варианты, спеки, related).
- **`/cart`** — полноценное оформление заказа (валидация, промокоды, undo-удаление).
- **`/auth/login`** — вход и регистрация (минимум данных: имя + телефон, email необязателен).
- **`/account`, `/account/orders`** — личный кабинет: профиль и мои заказы.
- **Supabase подключён** — каталог читается из БД (с фолбэком на моки), 7 категорий + 44 товара залиты через `npm run seed`.
- **CI/CD + деплой** — автодеплой на сервер по push в `main` (см. «Инфраструктура»).

### Пока не сделано / в планах ⏳

- **Реальный Supabase Auth** — вход/кабинет пока на localStorage-моке (`AuthProvider`); вход по телефону требует SMS-провайдера. Таблицы `profiles/orders/order_items` в схеме готовы.
- **Запись заказов из корзины в БД** — таблицы есть, оформление пока не пишет в них.
- **Корзина не персистится** — `useState` + сид-товары.
- **Поиск** — поле есть в хедере, но не подключено к странице результатов.
- **Нормальный домен + HTTPS для сайта** — сейчас сайт открыт по IP на :80 (`http://31.129.97.8/`); позже заменим IP на домен с сертификатом.
- **Страницы-заглушки маршрутов из хедера/футера** (ведут в 404): `/about`, `/blog`, `/delivery`, `/warranty`, `/trade-in`, `/loyalty`, `/contacts`, `/used`, `/catalog`, `/service-rules`, `/privacy`, `/consent`, `/offer`. Кастомной 404 тоже нет.

---

## Админка (`/admin`)

Полноценная панель управления магазином. Вход — `/admin/login` (реальный Supabase Auth + таблица `admin_users`, роли `admin`/`manager`/`content`, гард `requireAdmin()`). Все записи в БД идут через `adminMutation()` (проверка роли + журнал в `admin_audit_log` + `revalidatePath`).

**Разделы:** Обзор · Заказы · Заявки · Клиенты · Аналитика (сайта / заказов) · Каталог (Товары, Категории, Бренды, Цены выкупа) · Контент (Hero-баннер, **Блоки на главной**, Блог, Страницы) · Промо (Промокоды, Скидки) · Настройки (Магазин, Навигация, Доставка, Оплата, SEO, Уведомления, Интеграции, **Пользователи** + журнал действий табами) · Медиа-библиотека.

**Ключевые конвенции админки:**
- **Все выпадающие списки — кастомные (в интерфейсе сайта, не браузерные).** Примитив `Select` в `src/components/admin/form.tsx` — drop-in замена нативного `<select>` (принимает `value`/`onChange`/`<option>`-детей), меню рендерится в **портал с fixed-позицией**, поэтому не обрезается `overflow`-контейнерами таблиц.
- **Единый набор иконок на всю систему** — `src/lib/admin/icons.ts` (`ICON_SET` + `resolveIcon`), визуальный `IconPicker` (сетка иконок) используется в Преимуществах, шагах Trade-in и на витрине (`WhyAndFaq`).
- **«Блоки на главной»** (`/admin/content/home-blocks`) — один раздел с табами Bento-плитки / Trade-in / Преимущества + переключатели видимости каждого блока (ключ `home_blocks` в `shop_settings`).
- **Богатый редактор** (TipTap) с загрузкой картинок и режимом HTML-исходника — в Блоге и Страницах.
- Шапка: брендовая строка → хлебные крошки (`AdminTopbar`, с `CRUMB_OVERRIDES` для объединённых маршрутов) + меню по имени пользователя («На сайт» / «Выйти»).
- Даты в таблицах — `whitespace-nowrap` (одной строкой).

**Фото товара — единый источник правды.** Главное фото (`products.image`) + доп. фото (`products.gallery`, jsonb-массив URL **без** главного). Витрина и админка показывают один и тот же набор `productImages()` = `dedupe([image, ...gallery])` (`src/lib/utils/product-images.ts`). Галерея в админке (таб «Галерея») читает/пишет **те же колонки** — поэтому фото в админке и на сайте всегда совпадают. Точки-индикаторы в карточке (`ProductCard`) показываются только при реальной галерее (>1 фото) и в количестве реальных фотографий — фейковых точек больше нет.

**Картинки только из Storage, не из `/public`.** `npm run upload:images` заливает `public/{products,categories}` в бакеты `product-images`/`bento-tiles` и переписывает ссылки в БД (`products.image` **и `products.gallery`**, `categories.image/icon_url`, `bento_tiles`, `hero_slides`) на Storage-URL.

**Категории:** редактирование разбито на табы (как у товаров); тумблер «Показывать на главной» + лимит; нижний SEO-текст (`categories.seo_text`) выведен в админку и **рендерится как HTML** на странице категории (`CatalogShell` → `CatalogSeo`); счётчик товаров выводится **рядом с названием** (одна строка, `CatalogHero`); иконка категории показывается только в выпадающем списке «Все категории» в хедере, со страницы категории убрана.

**Опции, бейджи и фильтры товаров (admin-managed).** Реестр в `shop_settings`
(`product_options` — характеристики со справочником значений: Цвет/Память/SIM/Состояние;
`product_badges` — бейджи с цветом фона/текста и подсказкой). Управление — **Товары →
кнопка «Настройки»** (табы Опции/Бейджики). В карточке товара — таб **«Опции и Бейджи»**
(значения из справочника + несколько бейджей). В категории — таб **«Фильтры»** (перед SEO):
какие фильтры показывать (`categories.available_filters`; пусто → дефолт из кода; Цена всегда
видна). Бейджи рендерятся **единым компонентом `ProductBadges` слева — одинаково в карточках
и на странице товара**, подсказка при наведении из реестра. Детали — `docs/product-options-badges-filters.md`.

### Замечания и правки (changelog по итогам ревью)

- ✅ Опции/бейджи товаров вынесены в «Товары → Настройки»; в товаре — таб «Опции и Бейджи»; в категории — таб «Фильтры». Бейджи слева и одинаково в карточках и на странице товара (раньше на странице товара были другие и работали иначе), с подсказкой при наведении.

- ✅ Все браузерные `<select>` в админке заменены на кастомные in-UI выпадающие (+ портал, чтобы не обрезались в таблицах).
- ✅ Журнал аудита перенесён в раздел «Пользователи» (табами).
- ✅ Шапка: убрана «обрезанная» аватарка; имя пользователя — выпадающее меню «На сайт»/«Выйти».
- ✅ Хлебные крошки чинятся на объединённых маршрутах (Преимущества/Bento/Trade-in → «Блоки на главной»).
- ✅ Реальный визуальный выбор иконок (Преимущества) вместо текстового поля.
- ✅ Категория: в админку выведен **существующий** нижний SEO-блок (а не новый), HTML интерпретируется; счётчик товаров — рядом с названием; иконка убрана со страницы категории.
- ✅ Фото товара: устранено расхождение «на сайте N фото, в админке 1» — единый источник (`image`+`gallery`), картинки переведены в Storage-бакет (были относительные `/products/...`); дубль главного в галерее убирается.
- ✅ Точки в карточке товара: показываются только при >1 фото и по реальному количеству (убраны фейковые 4 точки при одном фото).
- ✅ Даты в админ-таблицах — одной строкой (`whitespace-nowrap`).

---

## Инфраструктура (GitHub, деплой, Supabase, MCP)

### GitHub и пуш
- Репозиторий: `git@github.com:EdMarshalAi/phonetrade.git`, ветка **`main`**.
- Пуш по SSH. Коммиты — на русском, с трейлером `Co-Authored-By: Claude …`.

### Автодеплой (CI/CD)
`.github/workflows/deploy.yml` — на каждый push в `main`:
`npm ci` → `npm run build` (standalone) → `rsync` бандла на сервер → `pm2 reload`. Проверено end-to-end (новый билд доезжает за ~1 мин).

**Секреты GitHub Actions** (Settings → Secrets and variables → Actions):

| Секрет | Значение |
|---|---|
| `SSH_PRIVATE_KEY` | приватная часть `~/.ssh/beget_phonetrade` — **вставлять целиком через `cat ~/.ssh/beget_phonetrade \| pbcopy`**, иначе `error in libcrypto` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://giwehapapi.beget.app` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon-ключ |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role ключ |

Host/user/port/path (`31.129.97.8`, `root`, `22`, `/opt/phonetrade`) захардкожены в `env:` воркфлоу.

### Сервер и роутинг
- `root@31.129.97.8` (Ubuntu 24.04), ключ `~/.ssh/beget_phonetrade`.
- Приложение: `/opt/phonetrade` (standalone), PM2 (`ecosystem.config.js`, порт 3000, автозапуск).
- **nginx (:80) роутит по Host** (`/etc/nginx/sites-available/phonetrade`): по **IP → сайт**, по домену `giwehapapi.beget.app` → Kong.
- **Сайт открыт по IP без порта: http://31.129.97.8/** (позже заменим на нормальный домен).

### Supabase (self-hosted, на том же сервере)
- Docker-стек в `/opt/beget/supabase`. API: `https://giwehapapi.beget.app`.
- Kong: HTTPS на **443** (SSL домена), HTTP на **8000** (перевешен с 80 ради nginx; `KONG_HTTP_PORT=8000` в `.env`).
- Postgres снаружи через pooler `31.129.97.8:5432`, логин `postgres.your-tenant-id`.
- Креды — в `/opt/beget/supabase/.env` (сервер) и локальном `.env.local`.
- Прямое управление: `ssh root@31.129.97.8 "docker exec -i supabase-db psql -U postgres -d postgres"`.

### MCP
- Сервер **`phonetrade-supabase`** в `~/.claude.json` — инструменты `mcp__phonetrade-supabase__*` для работы с БД из Claude Code (появляются после перезапуска сессии).
- ⚠️ Сервер `selfhosted-supabase` (IP `155.212.211.29`) — **другой проект, не трогать**.

---

## Конвенции

- **Контент на русском**, цены в рублях через `formatPrice()`.
- **Доступ к данным — только через геттеры** `lib/products.ts`, не импортировать моки напрямую.
- Цвета/радиусы — **только через токены** (`bg-ink`, `text-ink-muted`, `border-border/60`, `rounded-2xl`), не хардкодить hex.
- Server Component по умолчанию; `"use client"` — точечно, только для интерактива.
- Анимации — сдержанно, с уважением к `prefers-reduced-motion`.

---

## Дизайн-скилы (для будущей работы над UI)

В проект установлен набор дизайн-скилов `Leonxlnx/taste-skill` (через `npx skills add Leonxlnx/taste-skill`). Лежат в `.agents/skills/`, симлинками подключены к Claude Code в `.claude/skills/`. Скилы загружаются при старте сессии — после установки нужно перезапустить сессию, чтобы они стали доступны.

**Использовать для PhoneTrade в первую очередь** (соответствуют Apple-минимализму проекта):

- **`minimalist-ui`** — чистый редакторский стиль, тёплый монохром, типографический контраст, flat bento-сетки. Ближе всего к текущей эстетике сайта.
- **`high-end-visual-design`** — «дизайн как агентство»: выверенные шрифты, spacing, тени, структура карточек. Применять при создании новых секций/страниц.
- **`design-taste-frontend`** — anti-slop фронтенд для лендингов, портфолио и редизайнов (читает бриф → дизайн → код).
- **`redesign-existing-projects`** — аудит и апгрейд существующих страниц до премиум-уровня. Для доработки уже свёрстанных экранов.

**Как применять:** вызвать нужный скил через Skill tool перед версткой/редизайном конкретной страницы, держась наших [Конвенций](#конвенции) — серо-чёрная палитра через токены, сдержанные анимации, Apple HIG. Дизайн-стенс скилов («brutalist», «maximalist» и т.п.) **не** должен ломать существующую палитру и токены `globals.css`.

**Остальные скилы набора** (`brandkit`, `image-to-code`, `imagegen-frontend-web/-mobile`, `gpt-taste`, `industrial-brutalist-ui`, `stitch-design-taste`, `full-output-enforcement`, `design-taste-frontend-v1`) — для генерации изображений/референсов и других агентов; для текущих задач PhoneTrade обычно не нужны.

> Скилы — сторонний код, исполняются с полными правами агента. Перед использованием можно просмотреть `.agents/skills/<name>/SKILL.md`.
