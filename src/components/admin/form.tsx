"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
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

/* ── Select ───────────────────────────────────────────────────────────── */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }
>(({ className, hasError, children, ...props }, ref) => (
  <select ref={ref} className={cn(controlBase, borderCls(hasError), "h-10 px-2.5", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

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
          "relative h-5 w-9 rounded-full transition-colors duration-200",
          checked ? "bg-ink" : "bg-border-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </span>
      {label ? <span className="text-[13.5px] text-ink">{label}</span> : null}
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
