"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function StepHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-2 px-4 pt-1 pb-3">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Go back"
          className="-ml-2 mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 ease-standard hover:bg-raised hover:text-ink"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1 pt-1.5">
        <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-snug text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </header>
  );
}
