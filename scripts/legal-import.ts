/**
 * Импорт юридических текстов со старого сайта (phonetrade31.ru) в static_pages,
 * точь-в-точь по тексту, с аккуратной HTML-разметкой (h2/h3/ul/table) под .prose.
 * Текст берётся из /tmp/old_*.txt (извлечён из исходных страниц). Запуск:
 *   npx tsx scripts/legal-import.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Doc {
  slug: string;
  txt: string;
  start: number; // 1-based, inclusive (первая строка тела)
  end: number; // 1-based, inclusive
  h2: Set<string>;
  h3?: Set<string>;
  /** Точный текст строки-якоря таблицы (consent) → заменяется на готовый <table>. */
  tableAnchor?: string;
  tableHtml?: string;
  /** Замены строк (починка склеенных пробелов — текст не меняется по смыслу). */
  fix?: Record<string, string>;
}

const CONSENT_TABLE = `<table>
<thead><tr><th>Сервис</th><th>Оператор сервиса / реквизиты</th><th>Назначение</th></tr></thead>
<tbody>
<tr><td>Яндекс.Метрика и AppMetrica</td><td>ООО «Яндекс» (ОГРН 1027700229193, ИНН 7736207543, 119021, г. Москва, ул. Льва Толстого, д. 16)</td><td>веб-аналитика, оптимизация рекламных кампаний</td></tr>
<tr><td>VK Pixel (пиксель ретаргетинга «ВКонтакте»)</td><td>ООО «ВКонтакте» (ОГРН 1127847355391, ИНН 7842467438, 191024, г. Санкт-Петербург, Невский пр-кт, д. 28)</td><td>сбор обезличенных и (при авторизации) персональных данных для показа целевой рекламы и анализа конверсий</td></tr>
</tbody>
</table>`;

const DOCS: Doc[] = [
  {
    slug: "offer",
    txt: "/tmp/old_oferta.txt",
    start: 4,
    end: 75,
    h2: new Set([
      "1.1 Термины и определения",
      "2. Общие положения",
      "3. Регистрация на сайте и оформление заказа",
      "4. Доставка",
      "5. Оплата товара",
      "6. Обмен и возврат товара",
    ]),
    h3: new Set([
      "Возврат товара надлежащего качества.",
      "Возврат товара ненадлежащего качества.",
    ]),
  },
  {
    slug: "consent",
    txt: "/tmp/old_soglasie.txt",
    start: 4,
    end: 45,
    h2: new Set([
      "1. Категории обрабатываемых персональных данных",
      "2. Сервисы веб-аналитики и ретаргетинга",
      "3. Цели обработки персональных данных",
      "4. Действия с персональными данными",
      "5. Третьи лица-получатели",
      "6. Срок хранения и отзыв согласия",
      "7. Управление cookie и настройками приватности",
      "8. Подтверждение согласия",
    ]),
    tableAnchor: "СервисОператор сервиса / реквизитыНазначение",
    tableHtml: CONSENT_TABLE,
    fix: {
      "Согласие действует до его отзыва Пользователем или до ликвидации ИП Астахова Д.А.Отозвать согласие и реализовать иные права субъекта персональных данных, предусмотренные Федеральным законом № 152-ФЗ, можно, направив уведомление на e-mail Den_street69@mail.ru или по почтовому адресу Оператора.":
        "Согласие действует до его отзыва Пользователем или до ликвидации ИП Астахова Д.А. Отозвать согласие и реализовать иные права субъекта персональных данных, предусмотренные Федеральным законом № 152-ФЗ, можно, направив уведомление на e-mail Den_street69@mail.ru или по почтовому адресу Оператора.",
    },
  },
  {
    slug: "privacy",
    txt: "/tmp/old_privacy.txt",
    start: 4,
    end: 75,
    h2: new Set([
      "1. Общие положения",
      "2. Цели обработки персональных данных",
      "3. Правовые основания обработки персональных данных",
      "4. Категории субъектов и перечень обрабатываемых данных",
      "5. Способы и условия обработки персональных данных",
      "6. Меры по защите персональных данных",
      "7. Использование файлов cookie",
      "8. Права субъектов персональных данных",
      "9. Сроки обработки и хранения персональных данных",
      "10. Заключительные положения",
    ]),
    h3: new Set([
      "4.1. Категории субъектов, чьи данные обрабатывает Оператор",
      "4.2. Персональные данные, обрабатываемые Оператором",
      "4.4. Инструменты веб-аналитики и рекламного ретаргетинга",
    ]),
    fix: {
      "(политика обработки персональных данных)индивидуального предпринимателя Астахова Д.А.":
        "(политика обработки персональных данных) индивидуального предпринимателя Астахова Д.А.",
    },
  },
  {
    slug: "service-rules",
    txt: "/tmp/old_pravila.txt",
    start: 3,
    end: 77,
    h2: new Set([
      "Общие условия",
      "Предмет оферты",
      "Информирование Исполнителя о дефектах Устройства",
      "Диагностика Устройства и дополнительные работы",
      "Стоимость работ",
      "Сложный ремонт",
      "Срок выполнения работ",
      "Ограничения ответственности Исполнителя",
      "Сроки и ограничения гарантии",
      "Общие условия гарантийного обслуживания",
      "Замена элементов системы питания Устройства",
      "Прочие условия",
    ]),
  },
];

function isListItem(line: string): boolean {
  return /^[—–]\s/.test(line) || /^-\s/.test(line) || /^\d+\)\s/.test(line);
}

function buildHtml(doc: Doc): string {
  const allLines = readFileSync(doc.txt, "utf8").split("\n");
  const body = allLines.slice(doc.start - 1, doc.end);

  const out: string[] = [];
  let liBuf: string[] = [];
  const flushLi = () => {
    if (liBuf.length) {
      out.push("<ul>\n" + liBuf.map((t) => `<li>${esc(t)}</li>`).join("\n") + "\n</ul>");
      liBuf = [];
    }
  };

  for (let i = 0; i < body.length; i++) {
    let line = body[i].trim();
    if (!line) continue;
    if (doc.fix && doc.fix[line]) line = doc.fix[line];

    if (doc.tableAnchor && line === doc.tableAnchor) {
      flushLi();
      out.push(doc.tableHtml!);
      i += 2; // пропускаем две строки-данные таблицы (склеенные ячейки)
      continue;
    }
    if (doc.h2.has(line)) {
      flushLi();
      out.push(`<h2>${esc(line)}</h2>`);
      continue;
    }
    if (doc.h3?.has(line)) {
      flushLi();
      out.push(`<h3>${esc(line)}</h3>`);
      continue;
    }
    if (isListItem(line)) {
      liBuf.push(line.replace(/^[—–-]\s/, ""));
      continue;
    }
    flushLi();
    out.push(`<p>${esc(line)}</p>`);
  }
  flushLi();
  return out.join("\n");
}

async function main() {
  loadEnv();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  for (const doc of DOCS) {
    const html = buildHtml(doc);
    const { error } = await db
      .from("static_pages")
      .update({ content: html, updated_at: new Date().toISOString() })
      .eq("slug", doc.slug);
    if (error) {
      console.error(`✗ ${doc.slug}:`, error.message);
    } else {
      console.log(`✓ ${doc.slug} — ${html.length} символов HTML`);
    }
  }
}

main().then(() => process.exit(0));
