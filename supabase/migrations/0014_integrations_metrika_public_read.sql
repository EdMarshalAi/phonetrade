-- 0014: публичное чтение строки Я.Метрики из integrations.
--
-- Контекст: round-2 RLS-хардненинг (0006) закрыл всю таблицу integrations под
-- is_admin() — «секреты только админ». Но витрина читает ID счётчика Метрики
-- анонимным клиентом (getMetrikaId() в src/lib/content.ts), поэтому скрипт
-- Метрики перестал грузиться на сайте (0 визитов в счётчике).
--
-- Counter ID Я.Метрики НЕ секрет — он по природе виден в HTML любого сайта со
-- счётчиком. Открываем анонимное чтение ТОЛЬКО строки key='metrika' (и только
-- когда интеграция включена). Секреты в остальных строких (telegram bot_token,
-- smtp-пароль, openai-ключ) остаются под is_admin() — их строки этой политикой
-- не затрагиваются (RLS-политики пермиссивные, OR; предикат пропускает только
-- metrika-строку).

drop policy if exists "integrations metrika public read" on public.integrations;
create policy "integrations metrika public read" on public.integrations
  for select
  using (key = 'metrika' and is_enabled = true);
