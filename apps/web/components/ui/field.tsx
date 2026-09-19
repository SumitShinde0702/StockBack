"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  suffix?: ReactNode;
  mono?: boolean;
}

export function Field({
  label,
  hint,
  error,
  suffix,
  mono,
  className,
  ...rest
}: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full">
      {/* Visible label, never placeholder-only. */}
      <label
        htmlFor={id}
        className="mb-1.5 block text-[12px] font-medium text-ink-muted"
      >
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-control border bg-raised px-3",
          "transition-colors duration-200 ease-standard",
          "focus-within:border-gold/60",
          error ? "border-bad/50" : "border-line",
        )}
      >
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            // 16px minimum prevents iOS zoom-on-focus.
            "min-h-11 w-full bg-transparent text-[16px] text-ink outline-none",
            "placeholder:text-ink-subtle",
            mono && "font-mono text-[14px]",
            className,
          )}
          {...rest}
        />
        {suffix ? <span className="shrink-0 text-[13px] text-ink-muted">{suffix}</span> : null}
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[11.5px] leading-snug text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {/* Errors sit next to their field, not only in a summary at the top. */}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[11.5px] leading-snug text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
