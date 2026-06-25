"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Modal } from "@/components/admin/Modal";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <div className="space-y-1.5 text-[13px] leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-medium text-ink">{term}</span> — {children}
    </p>
  );
}

/** Кнопка «?» рядом с заголовком «Прайс» + модалка с инструкцией по разделу. */
export function PricingHelp() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Как пользоваться прайсом"
        aria-label="Как пользоваться прайсом"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-ink-subtle align-middle transition-colors hover:bg-surface hover:text-ink"
      >
        <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Как пользоваться прайсом" className="max-w-3xl">
        <div className="space-y-5 px-5 py-4">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Прайс — единый центр цен. Менеджер вводит <span className="font-medium text-ink">закупку</span> и
            <span className="font-medium text-ink"> курс закупа</span>, а продажные цены (наличными, картой, кредиты)
            считаются по формуле от курса и наценки категории. Витрина показывает готовые цены и ничего не считает.
          </p>

          <Section title="Курс и пересчёт">
            <Row term="Рабочий курс USD">основа всех цен. Меняется в плашке «Рабочий курс USD» (карандаш) или кнопкой «Из ЦБ +%». Сам по себе цены не меняет — нужно нажать «Пересчитать всё».</Row>
            <Row term="Из ЦБ +%">берёт актуальный курс ЦБ и добавляет вашу поправку.</Row>
            <Row term="Пересчитать всё">пересчитывает цены всех товаров по текущей формуле и курсу. Зафиксированные цены и Б/У не трогает. Если выбрана категория — пересчитывает только её.</Row>
          </Section>

          <Section title="Как считается цена (формула)">
            <p><span className="font-medium text-ink">База</span> = закупка в USD × рабочий курс × (1 + наценка категории). Закупка в USD = закупка ₽ ÷ курс закупа.</p>
            <p><span className="font-medium text-ink">Наличными</span> = округление базы. <span className="font-medium text-ink">Картой</span> = база × (1 + наценка карты категории). <span className="font-medium text-ink">Кредиты</span> 6/12/24 мес — база × соответствующие проценты.</p>
            <p>Шаг округления и кредитные проценты задаются в модалке <span className="font-medium text-ink">«Формула»</span>.</p>
          </Section>

          <Section title="Наценки по категориям (кнопка «Формула»)">
            <p>У каждой категории три параметра: <span className="font-medium text-ink">наценка обычная</span> (на закупку), <span className="font-medium text-ink">наценка по карте</span> и <span className="font-medium text-ink">мин. маржа ₽</span>.</p>
            <p>Наценка задаётся на общей (родительской) категории и каскадом применяется ко всем подкатегориям. У Б/У наценка по карте обычно выше (~30%).</p>
          </Section>

          <Section title="Колонки таблицы">
            <Row term="Закупка ₽ / Курс">правятся прямо в таблице (клик по значению) — цены пересчитываются сразу.</Row>
            <Row term="Нал / Карта">продажные цены. «Нал» — красная (цена за наличные), «Карта» — по формуле от базы.</Row>
            <Row term="Наценка">наценка категории, применённая к товару.</Row>
            <Row term="Маржа ₽">цена наличными − закупка ₽. Подсветка, если ниже минимума категории. Наценка считается от закупки по рабочему курсу — если он ниже курса закупа, часть наценки уходит на курсовую разницу.</Row>
            <Row term="Статус">цветная точка: зелёный — опубликован (на сайте), жёлтый — черновик, серый — архив. Клик — сменить.</Row>
          </Section>

          <Section title="Зафиксированная цена (фикс)">
            <p>Если цена задана вручную, товар «зафиксирован» — формула его не трогает при «Пересчитать всё». В колонке «Закупка» у таких стоит «фикс».</p>
            <p>У зафиксированных можно править <span className="font-medium text-ink">цену наличными</span> прямо в прайсе — карта и кредиты пересчитаются по формуле от неё. Снять фиксацию — в карточке товара или массовым действием «К формуле».</p>
          </Section>

          <Section title="Кнопки и тумблеры">
            <Row term="↻ в строке">пересчитать один товар по формуле.</Row>
            <Row term="Фикс">показать только товары с зафиксированной ценой.</Row>
            <Row term="Архивные">показать архивные (по умолчанию скрыты).</Row>
            <Row term="Столбцы">сбросить порядок, ширину и сортировку. Заголовки можно перетаскивать мышкой, тянуть за правый край (ширина) и кликать для сортировки.</Row>
            <Row term="На весь экран">развернуть таблицу во весь экран (свернуть — кнопкой в углу или Esc).</Row>
          </Section>

          <Section title="Импорт · Экспорт · YML-фид">
            <Row term="Импорт прайса">загрузить цены из файла XLSX или CSV.</Row>
            <Row term="Экспорт">скачать прайс файлом или отправить в Telegram.</Row>
            <Row term="YML-фид">ссылка с авто-ценами для ВКонтакте.</Row>
          </Section>

          <Section title="Массовое редактирование">
            <p>Отметьте товары галочками — снизу появится панель: наценить/скинуть закупку на % или ₽, задать курс закупа, пересчитать, вернуть к формуле, экспортировать выбранные.</p>
          </Section>

          <p className="rounded-lg bg-surface px-3 py-2 text-[12.5px] text-ink-muted">
            Б/У-товары в формулу не входят — их цены задаются вручную.
          </p>
        </div>
      </Modal>
    </>
  );
}
