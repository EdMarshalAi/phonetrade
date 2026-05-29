"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* Базовые классы контролов — крисп, плотно, на токенах. */
const controlBase =
  "w-full rounded-sm border bg-white text-[14px] text-ink placeholder:text-ink-subtle " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-ink/15 disabled:opacity-60";

function borderCls(hasError?: boolean) {
  return hasError ? "border-sale/50 focus:border-sale" : "border-border focus:border-ink";
}

/* ── Field: label + hint + error ──────────────────────────────────────── */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
          {label}
          {required ? <span className="ml-0.5 text-ink-subtle">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12px] text-sale">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Text input ───────────────────────────────────────────────────────── */
export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <input ref={ref} className={cn(controlBase, borderCls(hasError), "h-10 px-3", className)} {...props} />
));
TextInput.displayName = "TextInput";

/* ── Textarea ─────────────────────────────────────────────────────────── */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <textarea ref={ref} className={cn(controlBase, borderCls(hasError), "min-h-[88px] px-3 py-2 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

/* ── Select (кастомный, в интерфейсе — не браузерный) ─────────────────────
   Drop-in для native select: принимает value + onChange (вызывается с
   event-like { target: { value } }, чтобы работали и onChange={field.onChange},
   и onChange={(e)=>e.target.value}); опции передаются <option> детьми. */
type Opt = { value: string; label: React.ReactNode; disabled?: boolean };

function parseOptions(children: React.ReactNode): Opt[] {
  const out: Opt[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== "option") return;
    const p = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
    out.push({ value: String(p.value ?? ""), label: p.children, disabled: p.disabled });
  });
  return out;
}

export function Select({
  className,
  hasError,
  children,
  value,
  onChange,
  disabled,
  name,
  id,
}: {
  className?: string;
  hasError?: boolean;
  children?: React.ReactNode;
  value?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const opts = React.useMemo(() => parseOptions(children), [children]);
  const current = String(value ?? "");
  const selected = opts.find((o) => o.value === current);

  const pick = (v: string) => {
    onChange?.({ target: { value: v } } as unknown as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={current} readOnly /> : null}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(controlBase, borderCls(hasError), "flex h-10 items-center justify-between gap-2 px-2.5 text-left")}
      >
        <span className={cn("truncate", !selected && "text-ink-subtle")}>{selected?.label ?? "—"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-subtle transition-transform", open && "rotate-180")} strokeWidth={2} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-auto rounded-sm border border-border/70 bg-white py-1 shadow-lg">
            {opts.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                onClick={() => pick(o.value)}
                className={cn(
                  "flex w-full items-center px-3 py-1.5 text-left text-[14px] transition-colors disabled:opacity-40",
                  o.value === current ? "bg-ink text-white" : "text-ink hover:bg-surface"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ── Switch (toggle) ──────────────────────────────────────────────────── */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2.5 disabled:opacity-60"
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors duration-200",
          checked ? "bg-ink" : "bg-border-strong"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </span>
      {label ? <span className="text-left text-[13.5px] text-ink">{label}</span> : null}
    </button>
  );
}

/* ── Checkbox ─────────────────────────────────────────────────────────── */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded-[4px] border-border-strong text-ink accent-ink"
      />
      {label}
    </label>
  );
}

/* ── FormError: серверная ошибка над формой ───────────────────────────── */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-sm border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale">
      {message}
    </p>
  );
}

/* ── Кнопки ───────────────────────────────────────────────────────────── */
export function AdminButton({
  variant = "primary",
  size = "md",
  className,
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  const variants = {
    primary: "bg-ink text-white hover:bg-ink/90",
    outline: "border border-border bg-white text-ink hover:bg-surface",
    ghost: "text-ink hover:bg-surface",
    danger: "border border-sale/30 bg-white text-sale hover:bg-sale/5",
  };
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-[14px]" };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium",
        "transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99]",
        "disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

/** Submit-кнопка, которая сама показывает загрузку через useFormStatus (для <form action>). */
export function SubmitButton({
  children,
  className,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "outline" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <AdminButton type="submit" variant={variant} loading={pending} disabled={pending} className={className}>
      {children}
    </AdminButton>
  );
}
