-- 0018: юридические категории писем (docs/promo-analytics-phone-validation.md → addon).
-- transactional — без согласия/без отписки; service — без согласия маркетинга, но
-- с отпиской; marketing — только с согласием. Согласие service моделируется
-- ОТКАЗОМ: data_consents.consent_type='service_optout' (активная запись = отписан).

alter table public.email_templates add column if not exists legal_category text not null default 'marketing'
  check (legal_category in ('transactional', 'service', 'marketing'));

update public.email_templates set legal_category = 'transactional' where slug in ('order_confirmation', 'order_shipped');
update public.email_templates set legal_category = 'service' where slug in ('abandoned_cart_1', 'review_request');
update public.email_templates set legal_category = 'marketing'
  where slug in ('welcome_1', 'welcome_2', 'welcome_3', 'abandoned_cart_2', 'cross_sell_iphone', 'campaign_promo', 'campaign_newsletter', 'campaign_minimal');
