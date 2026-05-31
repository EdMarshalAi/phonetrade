"use client";

import * as React from "react";
import type { CodeSnippet } from "@/lib/integrations/snippets";

/**
 * Вставляет кастомные код-сниппеты (счётчики/пиксели/виджеты из админки) в DOM.
 * innerHTML не выполняет <script>, поэтому скрипты пересоздаются как настоящие
 * элементы. Гейтится cookie-согласием на аналитику (как и Метрика).
 */
export function CustomCodeInjector({ snippets, allowed }: { snippets: CodeSnippet[]; allowed: boolean }) {
  React.useEffect(() => {
    if (!allowed || snippets.length === 0) return;
    const added: HTMLElement[] = [];
    for (const s of snippets) {
      const target = s.placement === "head" ? document.head : document.body;
      const tpl = document.createElement("div");
      tpl.innerHTML = s.code;
      const marker = `ym-custom-${s.key}`;
      if (document.querySelector(`[data-int="${marker}"]`)) continue;
      Array.from(tpl.childNodes).forEach((node) => {
        let el: Node = node;
        if (node.nodeName === "SCRIPT") {
          const src = document.createElement("script");
          const orig = node as HTMLScriptElement;
          for (const attr of Array.from(orig.attributes)) src.setAttribute(attr.name, attr.value);
          src.text = orig.text;
          el = src;
        }
        if (el instanceof HTMLElement) el.setAttribute("data-int", marker);
        target.appendChild(el);
        if (el instanceof HTMLElement) added.push(el);
      });
    }
    return () => { added.forEach((el) => el.remove()); };
  }, [snippets, allowed]);

  return null;
}
