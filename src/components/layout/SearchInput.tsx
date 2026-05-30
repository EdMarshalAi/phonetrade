"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const QUERIES = [
  "iPhone 17 Pro 256GB Sage",
  "MacBook Air M4 13″",
  "AirPods Pro 3",
  "Apple Watch Series 10",
  "iPad Air M3 11″",
];

const TYPE_SPEED = 65;
const DELETE_SPEED = 35;
const PAUSE_AFTER_TYPE = 1600;
const PAUSE_AFTER_DELETE = 350;

export function SearchInput({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [phraseIdx, setPhraseIdx] = React.useState(0);
  const [phase, setPhase] = React.useState<"typing" | "pausing" | "deleting">(
    "typing"
  );
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const animationActive = !focused && value.length === 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  React.useEffect(() => {
    if (!animationActive) return;

    const phrase = QUERIES[phraseIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (typed.length < phrase.length) {
        timer = setTimeout(
          () => setTyped(phrase.slice(0, typed.length + 1)),
          TYPE_SPEED
        );
      } else {
        timer = setTimeout(() => setPhase("deleting"), PAUSE_AFTER_TYPE);
      }
    } else if (phase === "deleting") {
      if (typed.length > 0) {
        timer = setTimeout(
          () => setTyped(phrase.slice(0, typed.length - 1)),
          DELETE_SPEED
        );
      } else {
        timer = setTimeout(() => {
          setPhraseIdx((i) => (i + 1) % QUERIES.length);
          setPhase("typing");
        }, PAUSE_AFTER_DELETE);
      }
    }

    return () => clearTimeout(timer);
  }, [animationActive, typed, phase, phraseIdx]);

  React.useEffect(() => {
    if (!animationActive) {
      setTyped("");
      setPhase("typing");
    }
  }, [animationActive]);

  const isDark = tone === "dark";
  const placeholderColor = isDark ? "text-onDark-muted" : "text-ink-subtle";
  const iconColor = isDark ? "text-onDark-muted" : "text-ink-subtle";
  const inputText = isDark ? "text-white" : "text-ink";
  const fieldBg = isDark
    ? "bg-white/8 focus-within:bg-white/15 focus-within:ring-white/25"
    : "bg-surface focus-within:bg-white focus-within:ring-ink/15";
  const clearBtn = isDark
    ? "bg-white/15 hover:bg-white/25 text-white"
    : "bg-ink/10 hover:bg-ink/15 text-ink";

  return (
    <form
      role="search"
      action="/search"
      method="get"
      className="flex-1 min-w-0"
      onSubmit={submit}
    >
      <label
        className={cn(
          "group relative flex h-10 items-center rounded-xl transition-colors focus-within:ring-2",
          fieldBg
        )}
      >
        <Search
          className={cn(
            "absolute left-3.5 size-[15px] pointer-events-none",
            iconColor
          )}
          aria-hidden
        />

        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Поиск по каталогу"
          enterKeyHint="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore
          data-bwignore
          className={cn(
            "search-clean w-full h-full bg-transparent pl-10 pr-10 text-[13.5px] outline-none caret-current",
            inputText
          )}
        />

        {animationActive && (
          <span
            aria-hidden
            className={cn(
              "absolute left-10 right-10 pointer-events-none select-none truncate text-[13.5px]",
              placeholderColor
            )}
          >
            Поиск: {typed}
            <span
              className={cn(
                "ml-[1px] inline-block w-px h-3.5 align-middle animate-blink",
                isDark ? "bg-white/70" : "bg-ink/70"
              )}
            />
          </span>
        )}

        {value.length > 0 && (
          <button
            type="button"
            aria-label="Очистить поиск"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className={cn(
              "absolute right-2 inline-flex size-7 items-center justify-center rounded-full transition-colors",
              clearBtn
            )}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </label>
    </form>
  );
}
