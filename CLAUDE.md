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
```

Тестов в проекте нет — тестовый фреймворк не настроен (в `package.json` только `dev/build/start/lint`). Импорты — через алиас `@/*` → `src/*`.

## Стек

- **Next.js 16** (App Router, Server Components, `output: "standalone"`) + **React 19** + **TypeScript 5**.
- **Tailwind CSS v4** — конфигурация через `@theme` в `src/app/globals.css`, **без `tailwind.config.js`**.
- UI-примитивы на **@base-ui-components/react** (НЕ Radix). Иконки — `lucide-react`.
- Варианты компонентов — `class-variance-authority`; объединение классов — `cn()` (`tailwind-merge` + `clsx`).
- Анимации — `motion`/`framer-motion` 12, обёртка `MotionReveal`.

## Архитектура (big picture)

Понимание этих сквозных решений важнее, чем перечень файлов.

**Слой данных как seam под Supabase.** Компоненты НИКОГДА не импортируют моки напрямую — только async-геттеры из `src/lib/products.ts` (`getCategories`, `getProductsByCategory`, `getProductById`, `getRelatedProducts`, `getVariantsForProduct` и т.д.). Сейчас они возвращают статические массивы из `src/lib/data/products.ts`; при переходе на Supabase меняется только `products.ts`. Сохраняй эту границу.

**Дизайн-токены — единственный источник стилей.** Все цвета/радиусы/easing объявлены в `@theme`-блоке `src/app/globals.css` и используются через Tailwind-классы (`bg-ink`, `text-ink-muted`, `border-border/60`, `rounded-2xl`). Не хардкодить hex. Палитра — серый + чёрный (`--color-ink #1d1d1f` = текст и акцент/CTA) + белый; **единственное цветное исключение** — `--color-sale #e30000` (только для цены за наличные). Шрифт — системный Apple + Inter (latin+cyrillic) fallback.

**Server по умолчанию, Client точечно.** Страницы (`src/app/*/page.tsx`) — Server Components: грузят данные через геттеры и задают `generateMetadata()`. `"use client"` только там, где есть интерактив: `Header`, `CatalogShell`, `CartShell`, `ProductCard`, `ProductBuyPanel`.

**Состояние каталога живёт в URL.** Фильтры и сортировка кодируются в search params через хук `src/lib/catalog/use-catalog-filters.ts` (shareable-ссылки). Фасеты извлекаются из данных динамически (`src/lib/catalog/filters.ts` + конфиг на категорию в `category-config.ts`). Пагинация — в локальном стейте (не в URL).

**Корзина — локальный стейт без персистентности.** `CartShell` держит товары и `CheckoutState` в `useState` (сейчас сид-данные); глобального стора нет. Персистентность (localStorage/backend) ещё не реализована.

**Структура.** `src/app/` — маршруты `/`, `/category/[slug]`, `/product/[id]`, `/cart`. `src/components/` сгруппированы по доменам: `layout/`, `home/`, `catalog/`, `product/`, `product-detail/`, `cart/`, `ui/` (примитивы), `providers/`. `src/lib/` — `data/`, `products.ts`, `catalog/`, `cart/types.ts`, `utils/` (`cn`, `formatPrice`).

## Не реализовано

Supabase не подключён; корзина не персистится; поиск (поле в хедере есть) не подключён к странице результатов. Многие маршруты из хедера/футера ещё не имеют страниц и ведут в 404: `/about`, `/blog`, `/delivery`, `/warranty`, `/trade-in`, `/loyalty`, `/contacts`, `/used`, `/catalog`, `/account` и юридические страницы. Детальный статус относительно первоначального брифа — в `README.md` → «Статус реализации».
