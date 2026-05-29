-- 0012_cart_settings_blocks.sql
-- Настройки корзины (оплата/доставка) и редактируемые инфоблоки.
-- Хранятся в shop_settings (key/value jsonb). Старые разделы «Оплата»/«Доставка»
-- в админке удалены — их заменяет раздел «Корзина».

insert into shop_settings (key, value) values
('cart', '{"payments":[{"key":"sbp","enabled":true,"label":"СБП","note":"Без комиссии, мгновенно"},{"key":"card","enabled":true,"label":"Банковская карта","note":"Visa, Mastercard, Мир"},{"key":"cash","enabled":true,"label":"При получении","note":"Наличные или картой курьеру"},{"key":"credit","enabled":true,"label":"Кредит / Рассрочка","note":"Решение банка за 5 минут"}],"delivery":[{"key":"pickup","enabled":true,"label":"Самовывоз","note":"Бесплатно · сегодня","price":0,"freeFrom":0},{"key":"courier","enabled":true,"label":"Курьер","note":"Завтра, в удобное время","price":0,"freeFrom":0}]}'::jsonb),
('checkout_blocks', '[{"icon":"shield-check","title":"Безопасная оплата","text":"Защищённый канал, без сохранения карты"},{"icon":"refresh-cw","title":"Лёгкий возврат","text":"14 дней на возврат без объяснений"},{"icon":"heart-handshake","title":"Поддержка после покупки","text":"Настроим Apple ID и перенесём данные бесплатно"}]'::jsonb),
('product_blocks', '[{"icon":"map-pin","title":"Самовывоз","text":"В Универмаге Белгород · ул. Попова, 36"},{"icon":"truck","title":"Доставка по Белгороду","text":"Сегодня или завтра — курьер привезёт в удобное время"},{"icon":"shield-check","title":"Гарантия 12 + 12 месяцев","text":"Магазинная PhoneTrade плюс гарантия производителя Apple"},{"icon":"refresh-cw","title":"Trade-in сразу","text":"Сдайте старое устройство Apple и вычтем его сумму из цены","href":"/trade-in"}]'::jsonb)
on conflict (key) do nothing;
