"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gold text-on-gold hover:bg-gold/90 active:bg-gold/80 disabled:bg-gold/25 disabled:text-on-gold/60",
  secondary:
    "bg-raised text-ink border border-line hover:bg-overlay hover:border-line-strong active:bg-overlay/80 disabled:text-ink-subtle",
  ghost:
    "bg-transparent text-ink-muted hover:bg-raised hover:text-ink active:bg-overlay disabled:text-ink-subtle",
  danger:
    "bg-bad/15 text-bad border border-bad/35 hover:bg-bad/25 active:bg-bad/30 disabled:text-bad/40",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-[15px] rounded-control gap-2",
  lg: "min-h-14 px-5 text-[17px] rounded-card gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    block = false,
    icon,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center font-semibold tracking-[-0.01em]",
        "transition-[background-color,border-color,color,transform,opacity] duration-200 ease-standard",
        "active:scale-[0.985] disabled:active:scale-100 disabled:opacity-90",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === "lg" ? 20 : 16} /> : icon}
      {children}
    </button>
  );
});
