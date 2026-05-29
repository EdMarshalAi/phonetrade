-- 0010_product_options_badges.sql
-- Опции и бейджи товаров (admin-managed) + фильтры категорий.
--
-- Реестр опций/бейджей хранится в shop_settings (ключи product_options,
-- product_badges). Здесь — только колонки товаров и сид реестра/бэкфилл.

-- products: несколько бейджей (ключи) + значения кастомных опций.
alter table products add column if not exists badges  text[] not null default '{}';
alter table products add column if not exists options jsonb  not null default '{}'::jsonb;

-- categories.available_filters уже существует (0002/исходная схема) — это массив
-- ключей включённых фильтров для страницы категории (пусто → дефолт из кода).

-- Реестр опций (значения = справочник для выпадающих списков в товаре/фильтрах).
insert into shop_settings (key, value) values ('product_options', '[
  {"key":"color","label":"Цвет","field":"color","sort":0,"values":["Чёрный","Белый","Серый","Серебристый","Золотой","Синий","Зелёный","Красный","Жёлтый","Розовый","Оранжевый","Лавандовый","Сиреневый","Титан","Space Black","Jet Black","Midnight"]},
  {"key":"memory","label":"Память","field":"memory","sort":1,"values":["64GB","128GB","256GB","512GB","1TB"]},
  {"key":"sim","label":"SIM-карта","field":"sim","sort":2,"values":["eSIM + SIM","eSIM","nano-SIM","Dual SIM"]},
  {"key":"condition","label":"Состояние","field":"condition","sort":3,"values":["Идеальное состояние, без сколов","Отличное состояние, в комплекте кабель","Отличное состояние, родной аккумулятор","Очень хорошее состояние, незначительные потёртости","Хорошее состояние, потёртости по корпусу"]}
]'::jsonb)
on conflict (key) do nothing;

-- Реестр бейджей (цвета фона/текста + подсказка при наведении).
insert into shop_settings (key, value) values ('product_badges', '[
  {"key":"new","label":"Новинка","bg":"#1d1d1f","fg":"#ffffff","tooltip":"","sort":0},
  {"key":"no-rustore","label":"Без RuStore","bg":"#1d1d1f","fg":"#ffffff","tooltip":"Имеет недостаток в виде невозможности предустановки RuStore","sort":1},
  {"key":"in-stock","label":"В наличии","bg":"#ffffff","fg":"#1d1d1f","tooltip":"","sort":2},
  {"key":"check-availability","label":"Уточняйте наличие","bg":"#ffffff","fg":"#1d1d1f","tooltip":"","sort":3}
]'::jsonb)
on conflict (key) do nothing;

-- Бэкфилл бейджей товаров из устаревших is_new / badge.
update products set badges = (
  (case when is_new then array['new'] else array[]::text[] end)
  || (case
        when badge = 'Без RuStore' then array['no-rustore']
        when badge = 'В наличии' then array['in-stock']
        when badge = 'Уточняйте наличие' then array['check-availability']
        else array[]::text[]
      end)
)
where badges = '{}';
