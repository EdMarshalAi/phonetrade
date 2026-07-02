# SEO-аудит: seo-technical — PhoneTrade

_Дата: 2026-07-02. Метод: skill `seo-technical` (9 категорий) + чтение кода + живой сайт https://phonetrade31.ru._

## Что проверяет скил
Технический SEO по 9 категориям: краулинг, индексируемость, безопасность (заголовки/HTTPS), структура URL, мобильность, Core Web Vitals (LCP/INP/CLS), микроразметка, JS-рендеринг (SSR vs CSR), протокол IndexNow. Плюс управление AI-краулерами и «agent-friendly» доступность.

## Что у нас уже хорошо
- **HTTPS форсирован корректно.** `http://phonetrade31.ru/` → `301` на `https://` (проверено `curl -sI`). HTTP/2, валидный серт.
- **Security-заголовки на месте** (`next.config.ts:8-20`): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Проверено вживую — все заголовки отдаются. `poweredByHeader:false` (не светим X-Powered-By).
- **SSR по умолчанию.** Страницы — Server Components (`page.tsx` грузят данные server-side), критичный контент и мета в исходном HTML (title/canonical/JSON-LD видны без JS — проверено `curl`). Это лучший вариант для Яндекса, который рендерит JS хуже Google.
- **Канонические теги — self-referencing и корректны** на всех типах: `/` → `https://phonetrade31.ru`, `/category/iphone`, `/product/...`, `/blog`, `/catalog` — у каждого свой self-canonical.
- **Фасетные URL канонизированы правильно для Google.** `/category/iphone?color=black` → `<link rel=canonical href=".../category/iphone">` (проверено). Так дубли параметрических URL склеиваются.
- **Robots.txt — с Яндекс-директивами** (`src/app/robots.txt`): `Clean-param` для color/memory/sort/model/sim/condition + utm/yclid/gclid, `Host:`, `Sitemap:`. Это именно то, что нужно для приоритета «топ Яндекс».
- **Мобильность.** `viewport` в root layout (`width=device-width, initialScale=1`), Tailwind — responsive-first.
- **Оптимизация картинок Next** включена: `formats: ["image/avif","image/webp"]` (`next.config.ts:23`).
- **llms.txt есть и отдаётся 200** (`public/llms.txt`) — хороший сигнал для AI-поиска (YandexGPT/ChatGPT).

## Находки / проблемы (конкретно, файл/URL)

1. **IndexNow НЕ реализован** — `https://phonetrade31.ru/indexnow` → 404, ключевого файла нет в `public/`, в `src/` нет упоминаний indexnow (`grep`). Это самый значимый технический пробел под наш кейс: **IndexNow напрямую поддерживается Яндексом и Bing** и даёт мгновенную переиндексацию при изменении цен/наличия/новых товаров. Для магазина с 317 SKU и ежедневным пересчётом цен — прямое попадание в приоритет «топ Яндекс».

2. **Заголовки товаров с ломаной капитализацией** (данные, но влияет на title/H1 → SEO). Проверено вживую:
   - `/product/apple-ipad-air-11-m3-...` → H1 и `<title>`: «Apple **IPad** Air 11 **м3** 2024...» — должно быть «iPad Air 11 **M3**».
   - `iPhone 13 128**gb** Starlight` — «gb» строчными, должно «GB».
   Это ухудшает и релевантность (Яндекс чувствителен к точному вхождению «iPad»/«M3»), и вид сниппета. iPhone-заголовки в основном чистые; проблема у iPad/iMac (`IPad`/`IMac`) и части памяти.

3. **CSP отсутствует** (осознанно, комментарий `next.config.ts:6`: «без строгого CSP — чтобы не сломать YM/inline JSON-LD»). Не критично для ранжирования, но `Content-Security-Policy` — единственный отсутствующий заголовок из чек-листа скила. Можно добавить report-only.

4. **AI-краулеры не сегментированы в robots.txt.** Сейчас `User-agent: *` открыт всем. Это ОК (мы хотим цитируемости в AI-поиске), но нет явного контроля. Замечание уровня info.

5. **Core Web Vitals — измерить нельзя из HTML.** Главная отдаёт 459 КБ HTML (`content-length: 459261`) — крупновато, потенциальный риск для LCP/TTFB на мобильных. Требуется полевой замер (PageSpeed Insights / CrUX), которого в этом окружении нет. `x-nextjs-cache: HIT` — страницы прекэшированы (плюс к TTFB).

6. **`vary: rsc, next-router-state-tree, ...`** в заголовках — нормально для Next App Router, но раздутый Vary иногда мешает CDN-кэшу у промежуточных прокси. Низкий приоритет.

## Рекомендации

### 🔴 Критично
- **Внедрить IndexNow.** Сгенерировать ключ, положить `public/<key>.txt`, при `revalidatePath`/сохранении товара/изменении цены пинговать `https://yandex.com/indexnow?url=...&key=...` (и общий endpoint `api.indexnow.org`). Уже есть `adminMutation()` с `revalidatePath` — точка врезки готова. Это единственная 🔴 в техничке и она прямо бьёт в цель «топ Яндекс».

### 🟡 Важно
- **Починить капитализацию заголовков** (`iPad`/`iMac`/`M1-M4`/`GB`). Разовый скрипт-нормализатор по `products.title` (есть прецеденты: `scripts/regenerate-skus.ts`, `seo-refine-products.ts`). Правило: `IPad→iPad`, `IMac→iMac`, `Ipad→iPad`, `\bм(\d)→M\1`, `\b(\d+)gb→\1GB`. Обновить и `title`, и meta.
- **Полевой замер CWV** через PSI/CrUX после деплоя; если LCP > 2.5s на мобильных — уменьшить вес главной (459 КБ HTML — кандидат на разбивку/ленивую подгрузку ниже-fold секций).

### 🟢 Nice-to-have
- Добавить `Content-Security-Policy` в report-only режиме (мониторить, потом ужесточить).
- Явные правила для AI-краулеров в robots.txt (оставить `Allow: /` для GPTBot/ClaudeBot/PerplexityBot ради цитируемости — просто задокументировать намерение).

## Быстрые победы (за час)
1. Ключевой файл + минимальный пинг IndexNow (даже вручную из скрипта на старте) — Яндекс/Bing начнут быстрее переиндексировать.
2. Скрипт нормализации капитализации `iPad/iMac/GB/M3` по всем товарам (идемпотентный, как остальные `scripts/`).
3. CSP report-only одной строкой в `headers()`.

## Google vs Яндекс (нюансы под наш кейс — топ Белгород)
- **IndexNow** — работает у Яндекса и Bing, **не** у Google. Для нас это плюс: приоритет как раз Яндекс.
- **Clean-param в robots.txt** понимает **только Яндекс**; Google его игнорирует. У нас двойная защита: Clean-param (для Яндекса) + rel=canonical на базовую категорию (для Google) — правильная комбинация, менять не надо.
- **`Host:` директива** — легаси-сигнал Яндекса о главном зеркале; безвреден, оставить.
- **JS-рендеринг**: Яндекс рендерит JS заметно слабее Google. Наш SSR-подход (title/canonical/JSON-LD в исходном HTML) — ровно то, что нужно для Яндекса; ничего не переносить в клиентский рендер.
- **Точное вхождение** в заголовке для Яндекса важнее, чем для Google — отсюда повышенный вес фикса капитализации «iPad»/«M3».
