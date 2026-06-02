# Промт для Claude Code — Аналитика промокодов + Валидация телефонов РФ

> Скопируй в проект (`docs/promo-analytics-phone-validation.md`) и используй как промт.
> Две независимые задачи, делаются параллельно.

---

## ЗАДАЧА 1 — АНАЛИТИКА ПРОМОКОДОВ

### 1.1. Контекст

В админке есть раздел «Промо» с управлением промокодами. Сейчас видно только сам список (активные/неактивные, тип, размер скидки). **Нет аналитики**: непонятно какой промокод сработал сколько раз, сколько денег принёс, какая выручка с него.

### 1.2. Главное архитектурное решение

**Аналитика должна сохраняться даже после удаления промокода.** Если менеджер удаляет промокод — все исторические данные о его применении остаются в БД для отчётности.

Реализация: при удалении промокода **не удаляем строку**, а ставим `deleted_at = now()`. Soft delete. Промокод исчезает из списка активных, но в аналитике сохраняется навсегда.

### 1.3. Изменения в БД

```sql
-- Добавить soft delete к промокодам если не было
alter table promo_codes add column if not exists deleted_at timestamptz;

-- Индекс для быстрой фильтрации активных
create index if not exists idx_promo_codes_active 
on promo_codes(code) where deleted_at is null;

-- Таблица применений промокодов (для аналитики)
-- Если уже есть — пропустить. Если нет — создать.
create table if not exists promo_code_usages (
  id bigserial pk,
  promo_code_id uuid references promo_codes(id) on delete restrict,
  promo_code_snapshot text not null,        -- снапшот кода на момент применения (на случай если в БД переименуют)
  promo_type_snapshot text,                 -- 'percent' | 'fixed' | 'free_shipping'
  promo_value_snapshot numeric,             -- 10% или 1000 ₽
  
  -- Заказ
  order_id uuid references orders(id) on delete set null,
  order_number_snapshot text,               -- ORD-2026-1024
  
  -- Клиент
  customer_id uuid references customers(id) on delete set null,
  customer_email_snapshot text,
  
  -- Финансы
  cart_subtotal_rub numeric(10,0) not null,      -- сумма корзины ДО скидки
  discount_amount_rub numeric(10,0) not null,    -- размер скидки в рублях
  final_amount_rub numeric(10,0) not null,       -- итог к оплате (subtotal - discount)
  
  -- Источник
  source text,                              -- 'checkout' | 'cart' | 'api'
  utm jsonb,
  
  -- Статус заказа на момент применения
  order_status_at_use text,                 -- 'new' | 'paid' | 'cancelled'
  
  created_at timestamptz default now()
);

create index idx_promo_usages_code on promo_code_usages(promo_code_id);
create index idx_promo_usages_created on promo_code_usages(created_at desc);
create index idx_promo_usages_order on promo_code_usages(order_id) where order_id is not null;
```

**Запись в `promo_code_usages` происходит**:
- При успешном применении промокода в корзине → status order = `new`
- После оплаты → обновить `order_status_at_use = 'paid'`
- При отмене заказа → обновить `order_status_at_use = 'cancelled'`

Это нужно чтобы менеджер видел: «промокод применили 30 раз, но реально купили 20» (потеря в воронке).

### 1.4. SQL-функции для аналитики

```sql
-- Общая статистика по конкретному промокоду
create or replace function get_promo_stats(p_promo_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'total_uses', count(*),
    'paid_uses', count(*) filter (where order_status_at_use = 'paid'),
    'cancelled_uses', count(*) filter (where order_status_at_use = 'cancelled'),
    'pending_uses', count(*) filter (where order_status_at_use in ('new', null)),
    'total_discount_rub', coalesce(sum(discount_amount_rub) filter (where order_status_at_use = 'paid'), 0),
    'total_revenue_rub', coalesce(sum(final_amount_rub) filter (where order_status_at_use = 'paid'), 0),
    'avg_cart_rub', coalesce(round(avg(cart_subtotal_rub) filter (where order_status_at_use = 'paid')), 0),
    'unique_customers', count(distinct customer_id) filter (where customer_id is not null),
    'first_use_at', min(created_at),
    'last_use_at', max(created_at),
    'conversion_rate', case 
      when count(*) > 0 then round(
        count(*) filter (where order_status_at_use = 'paid')::numeric / count(*) * 100, 
        1
      )
      else 0
    end
  )
  from promo_code_usages
  where promo_code_id = p_promo_id;
$$;

-- Использование по дням (для графика)
create or replace function get_promo_usage_timeline(
  p_promo_id uuid,
  p_days int default 30
)
returns table (
  date date,
  total_uses int,
  paid_uses int,
  discount_rub numeric,
  revenue_rub numeric
)
language sql
stable
as $$
  select
    date_trunc('day', created_at)::date as date,
    count(*)::int as total_uses,
    count(*) filter (where order_status_at_use = 'paid')::int as paid_uses,
    coalesce(sum(discount_amount_rub) filter (where order_status_at_use = 'paid'), 0) as discount_rub,
    coalesce(sum(final_amount_rub) filter (where order_status_at_use = 'paid'), 0) as revenue_rub
  from promo_code_usages
  where promo_code_id = p_promo_id
    and created_at >= now() - make_interval(days := p_days)
  group by date_trunc('day', created_at)
  order by date;
$$;
```

### 1.5. UI в разделе «Промо»

**На странице списка промокодов** — добавить колонки в таблицу:

| Колонка | Источник |
|---|---|
| Применений (всего) | `get_promo_stats().total_uses` |
| Оплачено | `get_promo_stats().paid_uses` |
| Скидка ₽ | `get_promo_stats().total_discount_rub` (только оплаченные) |
| Выручка ₽ | `get_promo_stats().total_revenue_rub` (только оплаченные) |
| Конверсия | `paid_uses / total_uses × 100` |

Колонки сортируемые. Удалённые промокоды (deleted_at != null) показываются с серым фоном строки и бейджем «Удалён», но статистика по ним видна. Фильтр сверху таблицы — «Показать удалённые» (по умолчанию выкл).

**При клике на промокод** — детальная страница `/admin/promo/[id]` (или drawer) с расширенной аналитикой:

```
┌─────────────────────────────────────────────────────────┐
│ ← Промокод BLACKFRIDAY                  [Активен]       │
│ Скидка 15% · Создан 25 ноября 2026                      │
│                                                         │
│ ┌─────────────┬─────────────┬─────────────┬───────────┐│
│ │ Применений  │ Оплачено    │ Конверсия   │ Выручка   ││
│ │             │             │             │           ││
│ │    47       │    32       │   68%       │ 2.4 М ₽   ││
│ │             │             │             │           ││
│ │ Скидка дана:│             │             │ Средний   ││
│ │  187 200 ₽  │             │             │ чек:      ││
│ │             │             │             │  75 К ₽   ││
│ └─────────────┴─────────────┴─────────────┴───────────┘│
│                                                         │
│ График применений по дням (последние 30 дней)           │
│ [───────────chart──────────]                            │
│                                                         │
│ Заказы с этим промокодом                                │
│ ┌─────────┬─────────┬──────────┬────────┬──────────┐  │
│ │ Заказ   │ Клиент  │ Корзина  │ Скидка │ Статус   │  │
│ ├─────────┼─────────┼──────────┼────────┼──────────┤  │
│ │ ORD-... │ Иван И. │  85 000 ₽│ 12 750 │ Оплачен  │  │
│ │ ORD-... │ Пётр С. │  62 000 ₽│  9 300 │ Оплачен  │  │
│ │ ORD-... │ Анна К. │  96 000 ₽│ 14 400 │ Отменён  │  │
│ │ ...                                                  │  │
│ └─────────┴─────────┴──────────┴────────┴──────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Метрики (плитки):**
- Применений всего — общее число использований
- Оплачено — сколько из применивших реально купили
- Конверсия (%)
- Выручка (только оплаченные заказы)
- Скидка дана (общая сумма скидок)
- Средний чек

**График по дням** — линейный (Recharts), 30 дней. Две линии: «применений» и «оплачено». Подсветка дня при ховере.

**Таблица заказов** — список всех заказов где применялся этот промокод, с фильтром по статусу. Клик на заказ → переход в карточку заказа.

**Метрики кликов на промокод** (опционально, если требует дополнительной механики) — если есть отдельная статистика просмотров/копирования (например, пользователь скопировал в буфер через кнопку «Скопировать») — это тоже считать в `promo_code_views`. Пока без неё, чтобы не усложнять.

### 1.6. Удалённые промокоды

Когда менеджер нажимает «Удалить» — система спрашивает:
> «Промокод BLACKFRIDAY будет удалён из активных. Аналитика и связь с заказами сохранятся. Удалить?»
> [Удалить] [Отмена]

После удаления:
- `deleted_at = now()` в `promo_codes`
- Промокод **больше не работает** в чекауте (валидация `where deleted_at is null`)
- В списке промокодов **не виден** (если не включён фильтр «Показать удалённые»)
- В аналитике остаётся — можно открыть карточку, увидеть всю историю

В подразделе «Архив» или через фильтр — менеджер может восстановить удалённый (`deleted_at = null`), если случайно удалил.

### 1.7. Применение скидки

При оформлении заказа с промокодом — server action:

```ts
// Псевдокод
async function applyPromoCode(code: string, cart: Cart) {
  const promo = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .is('deleted_at', null)  // ВАЖНО: только не удалённые
    .single();
  
  if (!promo) return { error: 'Промокод не найден' };
  
  // ... валидация (дата истечения, лимит использований, мин. сумма заказа)
  
  const discount = calculateDiscount(promo, cart);
  
  // Записываем применение
  await supabase.from('promo_code_usages').insert({
    promo_code_id: promo.id,
    promo_code_snapshot: promo.code,
    promo_type_snapshot: promo.type,
    promo_value_snapshot: promo.value,
    customer_id: cart.customer_id,
    customer_email_snapshot: cart.customer_email,
    cart_subtotal_rub: cart.subtotal,
    discount_amount_rub: discount,
    final_amount_rub: cart.subtotal - discount,
    source: 'checkout',
    order_status_at_use: 'new',
  });
  
  return { success: true, discount };
}
```

После создания заказа — `promo_code_usages.order_id` обновляется на ID нового заказа.

При смене статуса заказа (paid/cancelled) — `promo_code_usages.order_status_at_use` обновляется.

---

## ЗАДАЧА 2 — ВАЛИДАЦИЯ ТЕЛЕФОНОВ РФ

### 2.1. Контекст

Сейчас в формах принимаются любые номера, включая мусор типа `79898988989898` (14 цифр), `12345`, `abc`. Это засоряет базу клиентов, ломает SMS-провайдеров, портит аналитику.

### 2.2. Что валидируем

**Допускается только российский формат:**
- `+7XXXXXXXXXX` (с плюсом, +7 и 10 цифр после = 11 цифр)
- `8XXXXXXXXXX` (без плюса, 8 и 10 цифр = 11 цифр)

**Нормализация на сервере:** любой формат от клиента → приводим к `+7XXXXXXXXXX` для хранения в БД.

**Валидные примеры:**
- `+7 (904) 098-88-77` → `+79040988877`
- `8 904 098 88 77` → `+79040988877`
- `89040988877` → `+79040988877`
- `+79040988877` → `+79040988877`

**Невалидные (отклонять):**
- `79898988989898` (14 цифр, слишком много)
- `12345` (мало цифр)
- `+1234567890` (не +7)
- `abc1234567` (не цифры)

**Дополнительно:** проверка что первая цифра после +7 — это **9** (мобильные номера РФ начинаются с +79XX). Городские номера +7 (495), +7 (812) и т.д. **не подходят** — для интернет-магазина нужны мобильные.

### 2.3. Утилита нормализации и валидации

`src/lib/validation/phone.ts`:

```ts
const RUSSIAN_MOBILE_PHONE_REGEX = /^\+7\d{10}$/;

/**
 * Нормализует российский номер телефона к формату +7XXXXXXXXXX.
 * Возвращает null если номер невалидный.
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;
  
  // Удаляем всё кроме цифр и плюса
  let digits = input.replace(/[^\d+]/g, '');
  
  // Если начинается с 8 — заменяем на +7
  if (digits.startsWith('8') && digits.length === 11) {
    digits = '+7' + digits.slice(1);
  }
  
  // Если начинается с 7 (без плюса) и 11 цифр — добавляем +
  if (digits.startsWith('7') && digits.length === 11 && !digits.startsWith('+')) {
    digits = '+' + digits;
  }
  
  // Если без префикса, 10 цифр — добавляем +7
  if (!digits.startsWith('+') && digits.length === 10) {
    digits = '+7' + digits;
  }
  
  // Проверяем итоговый формат
  if (!RUSSIAN_MOBILE_PHONE_REGEX.test(digits)) {
    return null;
  }
  
  // Проверяем что это мобильный (после +7 идёт 9)
  if (digits[2] !== '9') {
    return null;
  }
  
  return digits;
}

/**
 * Проверяет валидность номера без изменения.
 */
export function isValidRussianPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/**
 * Форматирует номер для отображения: +7 (904) 098-88-77
 */
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;
  
  // +7 (XXX) XXX-XX-XX
  const digits = normalized.slice(2); // убираем +7
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
}

/**
 * Zod-схема для использования в формах через react-hook-form
 */
import { z } from 'zod';

export const phoneSchema = z
  .string()
  .min(1, 'Введите номер телефона')
  .transform(val => normalizePhone(val))
  .refine(val => val !== null, {
    message: 'Введите номер в формате +7 (XXX) XXX-XX-XX',
  });
```

### 2.4. Использование в формах

**Везде где есть поле телефона** — применить:

1. Чекаут (оформление заказа)
2. Регистрация
3. Trade-in заявка
4. Форма обратной связи / запроса о наличии
5. Личный кабинет → редактирование профиля
6. Формы согласий
7. Любые другие формы с номером

**На клиенте (UX):**

- **Маска ввода** через `react-imask` или `cleave.js`:
  ```
  +7 (___) ___-__-__
  ```
- При фокусе на пустое поле — сразу `+7 ` (или `8 `) в начале
- При вводе цифр — автоматическое форматирование
- При вставке номера из буфера обмена (Ctrl+V) — корректно распознать любой формат (`89040988877`, `+7 904 098 88 77`, `7-904-098-88-77`) и привести к маске
- При ошибке валидации — текст под полем: «Введите номер в формате +7 (XXX) XXX-XX-XX»

**На сервере:**

В каждой server action:
```ts
const normalizedPhone = normalizePhone(formData.phone);
if (!normalizedPhone) {
  return { error: 'Неверный формат номера. Используйте российский мобильный (+7 9XX XXX-XX-XX)' };
}

// Сохраняем нормализованный
await supabase.from('orders').insert({
  ...,
  customer_phone: normalizedPhone,
});
```

### 2.5. Миграция существующих данных

В БД могут быть **уже сохранённые номера в разном формате** (если ранее валидация не работала). Нужна миграция:

```sql
-- Создаём временную функцию нормализации в БД
create or replace function normalize_russian_phone(input text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  if input is null or input = '' then return null; end if;
  
  -- Убираем всё кроме цифр и +
  digits := regexp_replace(input, '[^\d+]', '', 'g');
  
  -- 8XXXXXXXXXX → +7XXXXXXXXXX
  if digits ~ '^8\d{10}$' then
    digits := '+7' || substring(digits from 2);
  -- 7XXXXXXXXXX (без +) → +7XXXXXXXXXX
  elsif digits ~ '^7\d{10}$' then
    digits := '+' || digits;
  -- 10 цифр без префикса → +7XXXXXXXXXX
  elsif digits ~ '^\d{10}$' then
    digits := '+7' || digits;
  end if;
  
  -- Проверка финального формата
  if digits ~ '^\+79\d{9}$' then
    return digits;
  else
    return null;
  end if;
end;
$$;

-- Проверка: сколько номеров можно нормализовать
select 
  count(*) as total,
  count(normalize_russian_phone(phone)) as can_normalize,
  count(*) - count(normalize_russian_phone(phone)) as invalid
from customers
where phone is not null;

select
  count(*) as total,
  count(normalize_russian_phone(customer_phone)) as can_normalize
from orders
where customer_phone is not null;

select
  count(*) as total,
  count(normalize_russian_phone(customer_phone)) as can_normalize
from trade_in_leads
where customer_phone is not null;
```

**Покажи мне результаты этих SELECT перед миграцией.** Дальше план:

```sql
-- Бэкап старых значений в jsonb-колонку
alter table customers add column if not exists phone_old text;
alter table orders add column if not exists customer_phone_old text;
alter table trade_in_leads add column if not exists customer_phone_old text;

-- Сохраняем старые значения
update customers set phone_old = phone where phone is not null;
update orders set customer_phone_old = customer_phone where customer_phone is not null;
update trade_in_leads set customer_phone_old = customer_phone where customer_phone is not null;

-- Нормализуем
update customers 
set phone = normalize_russian_phone(phone)
where phone is not null;

update orders 
set customer_phone = normalize_russian_phone(customer_phone)
where customer_phone is not null;

update trade_in_leads
set customer_phone = normalize_russian_phone(customer_phone)
where customer_phone is not null;

-- Записи где нормализация не получилась — оставить с null phone, явно пометить в админке
-- В админке клиентов добавить фильтр «Нет валидного телефона» — менеджер увидит проблемных
-- и сможет связаться через email или удалить
```

После миграции **показать отчёт**: сколько номеров было, сколько нормализовалось, сколько осталось без телефона. Если много (>5%) — спросить меня что делать.

### 2.6. Constraint на уровне БД

После миграции добавить ограничения, чтобы в будущем невалидные номера в БД не попадали:

```sql
-- Constraint для проверки формата
alter table customers add constraint check_phone_format 
  check (phone is null or phone ~ '^\+79\d{9}$');

alter table orders add constraint check_customer_phone_format 
  check (customer_phone is null or customer_phone ~ '^\+79\d{9}$');

alter table trade_in_leads add constraint check_customer_phone_format 
  check (customer_phone is null or customer_phone ~ '^\+79\d{9}$');
```

Это последний рубеж — даже если в коде где-то баг и попытается записать невалидное, БД отклонит.

---

## ОБЯЗАТЕЛЬНЫЕ СКИЛЫ И MCP

Перед началом сделай `view` и применяй:

- `frontend-design`, `frontend-dev-guidelines`, `hig-foundations`, `hig-patterns`
- `core-components`, `shadcn`, `baseline-ui`
- Для графика в аналитике — `kpi-dashboard-design`, использовать Recharts (уже в проекте)
- Для масок телефона — `react-imask` (npm установить если нет)

MCP: `chrome-devtools` для финальной проверки. `magic` для UI карточки промокода если нужны варианты.

---

## ПОРЯДОК РАБОТЫ

1. **Архитектурный план** — `design-orchestration`
2. **Задача 1 — Промокоды:**
   - Миграции БД (soft delete + promo_code_usages)
   - SQL-функции аналитики
   - Изменения в server action `applyPromoCode` — запись в `promo_code_usages`
   - Обновление статуса использования при смене статуса заказа (paid/cancelled)
   - UI: колонки в списке промокодов
   - UI: детальная страница промокода с графиком и таблицей заказов
   - UI: фильтр «Показать удалённые», действие восстановления
3. **Задача 2 — Валидация:**
   - Утилита `normalizePhone` / `isValidRussianPhone` / `formatPhone` / `phoneSchema`
   - SQL-функция `normalize_russian_phone`
   - Миграция существующих данных — сначала отчёт по SELECT, потом UPDATE
   - Constraints на уровне БД
   - Маска ввода во всех формах (`react-imask`)
   - Валидация server-side через Zod
   - В админке клиентов добавить фильтр «Нет валидного телефона»
4. **Проверка через `chrome-devtools` / `playwright`:**
   - Попытка ввести невалидный номер — отклонено
   - Попытка ввести в разных форматах — все нормализуются
   - Промокод применён → запись в `promo_code_usages` создалась
   - Промокод удалён → не работает в чекауте, но виден в аналитике с deleted-бейджем
   - Восстановление промокода работает
   - График аналитики строится корректно
5. **`ui-visual-validator` + `ui-refactor`**
6. **Отчёт мне:** скриншоты, результаты миграции телефонов (сколько было / сколько нормализовалось / сколько отклонено)

---

## КРИТЕРИИ ПРИЁМКИ

**Аналитика промокодов:**
- ✅ Soft delete работает — удалённый промокод исчезает из активных, но виден в аналитике
- ✅ При применении промокода создаётся запись в `promo_code_usages` со снапшотами
- ✅ При смене статуса заказа обновляется `order_status_at_use`
- ✅ В списке промокодов видны метрики: применений / оплачено / скидка / выручка
- ✅ Детальная страница промокода с плитками и графиком работает
- ✅ Таблица заказов с этим промокодом отображается с фильтром по статусу
- ✅ Фильтр «Показать удалённые» работает
- ✅ Восстановление удалённого промокода работает

**Валидация телефонов:**
- ✅ Невалидные номера (мусор, неверная длина, не РФ-формат, не мобильный) отклоняются на клиенте и на сервере
- ✅ Валидные номера в любом формате приводятся к `+7XXXXXXXXXX`
- ✅ Маска ввода работает во всех формах
- ✅ При вставке номера из буфера автоматическое распознавание
- ✅ Существующие номера в БД мигрированы к единому формату
- ✅ Constraints в БД не дают записать невалидный номер
- ✅ В админке есть фильтр «Нет валидного телефона»
- ✅ Везде где отображается номер — форматирование `+7 (XXX) XXX-XX-XX` через `formatPhone()`

**Общее:**
- ✅ Lighthouse Performance ≥ 90 на страницах промо-аналитики
- ✅ Adaptive 375/768/1280
- ✅ Apple-эстетика, серая палитра
- ✅ Console без ошибок
- ✅ Все мутации в audit log

---

## ВАЖНЫЕ НЮАНСЫ

- **Снапшоты в `promo_code_usages`** — это ключ к сохранению истории. Даже если промокод удалят или переименуют, в применении видны изначальные значения (`promo_code_snapshot`, `promo_value_snapshot`).
- **`on delete restrict`** для `promo_code_id` — БД не даст физически удалить промокод если по нему есть применения. Удаление только через soft delete (`deleted_at`).
- **Тест валидации телефонов** обязательно с реальными кейсами:
  - `79898988989898` → отклонено (14 цифр)
  - `+78001234567` → отклонено (8001 — не мобильный)
  - `+79040988877` → принято
  - `8(904)098-88-77` → нормализовано до `+79040988877`
  - `+7 904 098 88 77` → нормализовано до `+79040988877`
  - `tel:79040988877` → нормализовано до `+79040988877` (удалить `tel:`)
  - `abc` → отклонено
- **Не блокировать поле телефона жёстко** на клиенте — иначе сломается работа с автозаполнением браузера и парольных менеджеров. Маска должна быть мягкой (форматирует при вводе), а валидация — на blur и сабмите.
- **Городские номера РФ** (+7 495, +7 812 и т.д.) — отклоняются нашей проверкой `digits[2] === '9'`. Если в будущем понадобится принимать городские (для каких-то юр.лиц) — это отдельная задача, расширение допустимых форматов.
- **Иностранные номера** — не принимаются. Если клиент из Казахстана / Беларуси и хочет купить — это редкий случай, менеджер обрабатывает вручную через звонок. Если бизнес начнёт массовые отправки в эти страны — расширим валидацию.
- **Аналитика по UTM и источникам** в применениях промокода — пишется в `utm jsonb`, может пригодиться позже для отслеживания «откуда пришли клиенты с этим промокодом» (рекламные кампании).
