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
npm run dev      # dev-сервер (Turbopack), http://localhost:3000 (или следующий свободный порт)
npm run build    # production-сборка (standalone)
npm run start    # запуск собранного приложения
npm run lint     # ESLint
```

Импорты идут через алиас `@/*` → `./src/*` (см. `tsconfig.json`).

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

**Слой данных — через геттеры**, компоненты НЕ импортируют моки напрямую. Источник сейчас — статические TS-массивы; спроектировано под будущую замену на **Supabase** без переписывания компонентов (меняется только `src/lib/products.ts`).

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
- **`/cart`** — полноценное оформление заказа.

### Пока не сделано / в планах ⏳

- **Supabase не подключён** — данные из моков (по брифу — на будущее; схема спроектирована совместимо).
- **Корзина не персистится** — `useState` + сид-товары; нужен localStorage / backend.
- **Поиск** — поле есть в хедере, но не подключено к странице результатов.
- **Страницы-заглушки маршрутов из хедера/футера ещё не созданы** (ведут в 404): `/about`, `/blog`, `/delivery`, `/warranty`, `/trade-in`, `/loyalty`, `/contacts`, `/used`, `/catalog`, `/account`, `/service-rules`, `/privacy`, `/consent`, `/offer`. Кастомной 404-страницы тоже нет.
- Самопроверка через MCP (lighthouse, скриншоты 375/768/1280) из брифа — выполнялась интерактивно, в коде не фиксируется.

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
