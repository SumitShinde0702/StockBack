import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface hairline-top",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
      <div className="flex items-center gap-2 text-ink-muted">
        {icon}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
