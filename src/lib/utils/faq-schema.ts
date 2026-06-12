/**
 * Извлечение FAQ из HTML-описания (товары/статьи) и сборка FAQPage JSON-LD
 * для rich-сниппетов в Яндексе/Google. Поддерживает два формата вопросов:
 *  • <h3>Вопрос?</h3><p>Ответ</p>            (статьи блога)
 *  • <p><strong>Вопрос?</strong> Ответ</p>    (SEO-блок товаров)
 */
export type FaqPair = { q: string; a: string };

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function faqFromHtml(html: string | null | undefined): FaqPair[] {
  if (!html) return [];
  // Сканируем ТОЛЬКО секцию после «Частые вопросы» (так и в товарах, и в статьях),
  // чтобы не схватить обычные h3/p из тела статьи (защита от кривой вёрстки).
  const marker = html.search(/Частые\s+вопрос|F\.?A\.?Q/i);
  const scope = marker >= 0 ? html.slice(marker) : html;

  const out: FaqPair[] = [];
  const seen = new Set<string>();
  const push = (qRaw: string, aRaw: string) => {
    const q = stripTags(qRaw);
    const a = stripTags(aRaw);
    // вопрос — короткий и со знаком «?»; ответ — осмысленной длины
    if (
      q && a && q.includes("?") &&
      q.length >= 8 && q.length <= 160 &&
      a.length >= 10 && a.length <= 700 &&
      !seen.has(q.toLowerCase())
    ) {
      seen.add(q.toLowerCase());
      out.push({ q, a });
    }
  };
  // Формат А: <h3>Вопрос?</h3> <p>Ответ</p>
  const reH3 = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = reH3.exec(scope))) push(m[1], m[2]);
  // Формат Б: <p><strong>Вопрос?</strong> Ответ</p>
  const reStrong = /<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>([\s\S]*?)<\/p>/gi;
  while ((m = reStrong.exec(scope))) push(m[1], m[2]);
  return out.slice(0, 10); // не раздувать
}

export function faqPageLd(pairs: FaqPair[]): Record<string, unknown> | null {
  if (!pairs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: { "@type": "Answer", text: p.a },
    })),
  };
}
