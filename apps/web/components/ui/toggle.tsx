"use client";

import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-card px-1 py-2.5 text-left",
        "transition-opacity duration-200 ease-standard disabled:opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ease-standard",
          checked ? "border-gold/50 bg-gold/80" : "border-line-strong bg-overlay",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-ink shadow-sm",
            "transition-[left] duration-200 ease-spring",
            checked ? "left-6" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
