# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

PhoneTrade — интернет-магазин техники Apple (Белгород, ул. Попова, 36). Строгая Apple-эстетика: серо-чёрная палитра, крупная типографика, сдержанные анимации. UI и контент на русском, цены в рублях. Подробная документация — в `README.md`.

> **Next.js 16 содержит breaking changes** относительно обучающих данных моделей. Перед написанием кода читай гайды в `node_modules/next/dist/docs/` (см. `AGENTS.md`).

## Commands

```bash
npm run dev      # dev-сервер (Turbopack), http://localhost:3000 (или следующий свободный порт)
npm run build    # production-сборка (output: "standalone")
npm run start    # запуск собранной сборки
npm run lint     # ESLint (eslint-config-next)
npm run seed     # залить каталог из моков в Supabase (tsx scripts/seed-supabase.ts)
```

Тестов в проекте нет — тестовый фреймворк не настроен. Импорты — через алиас `@/*` → `src/*`.

Локальный запуск требует `.env.local` (см. `.env.example`) с переменными Supabase — без них слой данных откатывается на моки. **`.env.local` в `.gitignore`, не коммитить.**

## Стек

- **Next.js 16** (App Router, Server Components, `output: "standalone"`) + **React 19** + **TypeScript 5**.
- **Tailwind CSS v4** — конфигурация через `@theme` в `src/app/globals.css`, **без `tailwind.config.js`**.
- UI-примитивы на **@base-ui-components/react** (НЕ Radix). Иконки — `lucide-react`.
- Данные — **@supabase/supabase-js** (self-hosted Supabase, см. «Инфраструктура»).
- Варианты компонентов — `class-variance-authority`; объединение классов — `cn()` (`tailwind-merge` + `clsx`).
- Анимации — `motion`/`framer-motion` 12, обёртка `MotionReveal`.

## Архитектура (big picture)

Понимание этих сквозных решений важнее, чем перечень файлов.

**Слой данных подключён к Supabase (с фолбэком на моки).** Компоненты НИКОГДА не импортируют моки напрямую — только async-геттеры из `src/lib/products.ts` (`getCategories`, `getProductsByCategory`, `getProductById`, `getRelatedProducts`, `getVariantsForProduct` и т.д.). Геттеры читают из Supabase через anon-клиент `src/lib/supabase/client.ts`; при ошибке или без env-переменных откатываются на статические массивы из `src/lib/data/products.ts`. **Мок-данные остаются источником истины** — `npm run seed` заливает их в БД (схема `supabase/schema.sql`). Маппинг строк БД (snake_case) ↔ домен (camelCase) — в `src/lib/supabase/types.ts`. Сохраняй эту границу: новые поля сначала в `data/products.ts` + `Product`, затем в схему/мапперы.

**Админка (`/admin`) — реальный Supabase Auth + RBAC.** Гард `requireAdmin()`, таблица `admin_users` (роли `admin`/`manager`/`content`), все записи через `adminMutation()` (роль + аудит в `admin_audit_log` + `revalidatePath`). Сквозные правила: **все выпадающие — кастомный `Select` из `src/components/admin/form.tsx`** (drop-in нативного `<select>`, меню в **портале с fixed-позицией** — не обрезается `overflow` таблиц), **не** добавлять браузерные `<select>`. Иконки — единый `src/lib/admin/icons.ts` + `IconPicker`. Bento/Trade-in/Преимущества объединены в «Блоки на главной» (`/admin/content/home-blocks`, видимость в `shop_settings.home_blocks`). Даты в таблицах — `whitespace-nowrap`. Подробности — в `README.md` → «Админка».

**Опции/бейджи/фильтры товаров.** Реестр в `shop_settings` (`product_options` — характеристики со справочником значений; `product_badges` — бейджи с bg/fg/tooltip), геттеры `getProductOptions()`/`getProductBadges()` в `content.ts`. Базовые опции (color/memory/sim/condition) пишутся в свои колонки, кастомные — в `products.options jsonb`; бейджи — `products.badges text[]` (несколько). Фильтры категории — `categories.available_filters` (пусто → фолбэк на `category-config.ts`; цена всегда видна). Бейджи на витрине — ТОЛЬКО через единый `ProductBadges` (слева, из реестра, с tooltip), одинаково в карточках и на странице товара; не дублировать старый одиночный `badge`/`isNew`-пилл. Управление: «Товары → Настройки», табы товара «Опции и Бейджи», таб категории «Фильтры».

**Фото товара — единый источник: колонки `products.image` (главное) + `products.gallery` (доп. фото, jsonb-URL, БЕЗ главного).** Витрина и админка показывают `productImages()` = `dedupe([image, ...gallery])` (`src/lib/utils/product-images.ts`); таб «Галерея» в админке читает/пишет ЭТИ ЖЕ колонки (через `variant-actions.ts`), отдельная таблица `product_images` для галереи товара не используется. Точки в `ProductCard` — только при >1 фото и по реальному количеству. **Картинки — только из Storage-бакетов, не из `/public`**: `npm run upload:images` заливает и переписывает `image`+`gallery`+категории/hero/bento на Storage-URL. Не хардкодить относительные `/products/...` пути.

**Дизайн-токены — единственный источник стилей.** Все цвета/радиусы/easing объявлены в `@theme`-блоке `src/app/globals.css` и используются через Tailwind-классы (`bg-ink`, `text-ink-muted`, `border-border/60`, `rounded-2xl`). Не хардкодить hex. Палитра — серый + чёрный (`--color-ink #1d1d1f` = текст и акцент/CTA) + белый; **единственное цветное исключение** — `--color-sale #e30000` (только для цены за наличные). Шрифт — системный Apple + Inter (latin+cyrillic) fallback.

**Server по умолчанию, Client точечно.** Страницы (`src/app/*/page.tsx`) — Server Components: грузят данные через геттеры и задают `generateMetadata()`. `"use client"` только там, где есть интерактив: `Header`, `CatalogShell`, `CartShell`, `ProductCard`, `ProductBuyPanel`.

**Состояние каталога живёт в URL.** Фильтры и сортировка кодируются в search params через хук `src/lib/catalog/use-catalog-filters.ts` (shareable-ссылки). Фасеты извлекаются из данных динамически (`src/lib/catalog/filters.ts` + конфиг на категорию в `category-config.ts`). Пагинация — в локальном стейте (не в URL).

**Корзина и авторизация — мок на клиенте.** `CartShell` держит товары и `CheckoutState` в `useState`. Авторизация и кабинет (`/auth/login`, `/account`, `/account/orders`) реализованы на **localStorage-моке** через `src/components/providers/AuthProvider.tsx` (вход по телефону, регистрация имя+телефон+email, профиль, заказы). Реальный Supabase Auth ещё не подключён (вход по телефону требует SMS-провайдера). Таблицы `profiles/orders/order_items` в схеме уже есть.

**Структура.** `src/app/` — маршруты `/`, `/category/[slug]`, `/product/[id]`, `/cart`, `/auth/login`, `/account`, `/account/orders`. `src/components/` по доменам: `layout/`, `home/`, `catalog/`, `product/`, `product-detail/`, `cart/`, `account/`, `auth/`, `ui/`, `providers/` (включая `AuthProvider`). `src/lib/` — `data/`, `products.ts`, `supabase/` (`client.ts`, `types.ts`), `catalog/`, `cart/`, `account/orders.ts`, `utils/`.

## Инфраструктура (GitHub, деплой, Supabase, MCP)

**GitHub.** Репозиторий `git@github.com:EdMarshalAi/phonetrade.git` (владелец `EdMarshalAi`), ветка `main`. Пуш по SSH (`ssh git@github.com` авторизован). Коммиты заканчивать `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**CI/CD — автодеплой по push в `main`.** `.github/workflows/deploy.yml`: `npm ci` → `npm run build` (standalone, с `NEXT_PUBLIC_SUPABASE_*` из секретов) → `rsync` standalone-бандла на сервер → `pm2 reload`. Проверено end-to-end. Секреты GitHub Actions: `SSH_PRIVATE_KEY` (приватная часть `~/.ssh/beget_phonetrade`; **вставлять только целиком через `cat … | pbcopy`**, иначе `error in libcrypto`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Host/user/port/path захардкожены в `env:` воркфлоу (секреты `SSH_HOST`/`DEPLOY_PATH` не нужны).

**Сервер и роутинг.** `root@31.129.97.8` (Ubuntu 24.04), ключ `~/.ssh/beget_phonetrade`. Приложение в `/opt/phonetrade` (standalone), PM2 (`ecosystem.config.js`, порт 3000, автозапуск). **nginx (порт 80) роутит по Host:** по IP `http://31.129.97.8/` → сайт (:3000); по домену `giwehapapi.beget.app` → Kong (:8000). Конфиг: `/etc/nginx/sites-available/phonetrade`. **Сайт открыт по IP без порта: http://31.129.97.8/** (позже заменим IP на нормальный домен).

**Supabase.** Self-hosted Docker-стек в `/opt/beget/supabase` на том же сервере. Публичный API: `https://giwehapapi.beget.app`. Kong: HTTPS на **443** (SSL домена, не трогать), HTTP перевешен на **8000** (раньше был 80 — освободили под nginx; `KONG_HTTP_PORT=8000` в `/opt/beget/supabase/.env`). Postgres снаружи через pooler `31.129.97.8:5432`, логин `postgres.your-tenant-id`. Креды — в `/opt/beget/supabase/.env` (и в локальном `.env.local`). Прямое управление БД: `ssh root@31.129.97.8 "docker exec -i supabase-db psql -U postgres -d postgres"`.

**MCP.** Сервер `phonetrade-supabase` в `~/.claude.json` (бинарь `selfhosted-supabase-mcp`, та же схема, что у других проектов; доступен после перезапуска Claude Code) — инструменты `mcp__phonetrade-supabase__*` для работы с БД. ⚠️ Сервер `selfhosted-supabase` (IP `155.212.211.29`) — **другой проект, не трогать**.

## Контент-страницы, поиск, SEO

**Статические страницы — из админки.** `/admin/content/pages` пишет в `static_pages` (slug, title, content-HTML, meta, status). Опубликованная страница сразу отдаётся по `/{slug}` через катч-олл `(site)/[slug]/page.tsx` (`getStaticPage`) — отдельный роут заводить не нужно. Уже есть и работают: `/about`, `/delivery`, `/warranty`, `/trade-in`, `/loyalty`, `/contacts`, `/privacy`, `/offer`, `/consent`, `/service-rules`. `/blog` и `/blog/[slug]` — отдельные роуты (таблицы блога). `/new` (товары `is_new`) и `/used` (Б/У, CatalogShell) — отдельные коллекционные роуты.

**Поиск.** `searchProducts()` (матч по всем словам в title/model/цвете/памяти/категории) → страница `/search?q=` (грид `ProductCard`, пустые состояния). `SearchInput` отправляет на `/search`; запрос логируется в `search_queries` (`trackSearch`) и виден в аналитике «Поведение».

**SEO.** `src/app/sitemap.ts` (ISR `revalidate=3600`) собирает главную, `/catalog`, `/new`, `/used`, `/blog`, все категории, опубликованные товары, **все опубликованные `static_pages`** и посты блога — новая страница из админки попадает в карту автоматически (в течение часа). `src/app/robots.ts` — allow всё, disallow `/admin /account /cart /auth /search`. Базовый URL — `NEXT_PUBLIC_SITE_URL` (фолбэк `http://31.129.97.8`).

## Прайс (ценообразование)

**Единый источник цен — раздел `Каталог → Прайс` (`/admin/catalog/pricing`).** Менеджер вводит в товаре закупку (`cost_rub`) + курс закупа (`cost_rate`) → БД считает `cost_usd` (generated). Цены (`price_cash/price_card`, `credit_6m/12m/24m_total+monthly`) пересчитываются **только server-side** по формуле от неокруглённой базы (без каскадных округлений): Postgres-функция `recalculate_all_prices(reason,user,ids?)` и зеркальная `src/lib/pricing/calculate.ts`. Витрина читает готовые поля, ничего не считает. Настройки формулы — синглтон `pricing_settings` (наценки FX/карта/кредиты, округление, мин.маржа, автокурс). `price_override=true` фиксирует цену вручную (формула не трогает). Триггеры пересчёта: сохранение товара (`applyPricing` в `catalog/products/actions.ts`), drawer «Формула»/inline-правка/bulk/импорт (`catalog/pricing/actions.ts` + `io-actions.ts`). История — `product_price_history`. Б/У (`type='used'`) и архив в формулу не входят.

**Курс ЦБ.** `src/lib/pricing/cbr.ts` (cbr-xml-daily JSON + фолбэк cbr.ru XML) → таблица `currency_rates`. Роут `/api/cron/cbr-rate` (защита `CRON_SECRET`) + GitHub Actions `cbr-rate.yml` (ежечасно). Авто-обновление рабочего курса — только при `use_cbr_auto` и скачке ≤5%. **Чтобы включить авто-курс: добавить `CRON_SECRET` в GitHub Secrets и env сервера.** Telegram-триггеры: `pricing_recalc_done`, `pricing_import_done`, `pricing_below_margin`, `cbr_rate_big_change`, `cbr_rate_fetch_failed`. Импорт/экспорт XLSX·CSV — `xlsx`+`papaparse` (server-only). Полная спека — `docs/pricing-module.md`.

## Не реализовано

Персистентность корзины между сессиями; нормальный домен + HTTPS (сейчас по IP на :80). Реальный Supabase Auth, запись заказов из корзины в БД и поиск — **сделаны** (оформление чинилось: лишняя колонка `customer_phone` в insert рушила все заказы). Детальный статус — в `README.md` → «Статус реализации».
