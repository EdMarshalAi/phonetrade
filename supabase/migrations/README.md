# Миграции БД — админка

Аддитивные миграции для админ-панели. **Не ломают** живые таблицы и
прод-сайт (см. `docs/admin-build-plan.md`, решения D1–D2).

## Порядок применения

Применять строго по номерам (зависимости: 0002/0003/0004 ссылаются на
helper `is_admin()` из 0001; 0004 добавляет FK на `customers`):

```
0001_admin_core.sql                  -- admin_users, is_admin()/admin_role(), audit-log
0002_extend_existing.sql             -- +колонки в categories/products/orders/order_items
0003_catalog.sql                     -- product_variants, product_images, brands, trade_in_prices
0004_orders_customers_leads.sql      -- customers, order_status_history, leads
0005_content.sql                     -- hero/bento/advantages/trade-in/blog/pages/menu
0006_promotions_settings_analytics.sql -- promo_codes, settings, integrations, redirects, page_views, search_queries
0007_storage.sql                     -- Storage-бакеты + политики
```

Все файлы идемпотентны (`if not exists` / `drop policy if exists`) — повторное
применение безопасно.

## Как применить к живой БД (после ревью)

Вариант A — MCP (по одному файлу):
`mcp__phonetrade-supabase__apply_migration` с содержимым файла.

Вариант B — psql через SSH:
```bash
for f in supabase/migrations/000*.sql; do
  ssh root@31.129.97.8 "docker exec -i supabase-db psql -U postgres -d postgres" < "$f"
done
```

## После миграций

1. Создать первого админа (см. `scripts/seed-admin.ts` или SQL ниже).
2. (Опционально) дозаполнить новые поля товаров через `npm run seed` или вручную.

`schema.sql` в корне `supabase/` остаётся базовой схемой публичного сайта;
эти миграции — слой админки поверх неё.
