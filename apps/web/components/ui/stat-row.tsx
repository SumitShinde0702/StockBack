import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StatRow({
  label,
  value,
  hint,
  tone = "default",
  emphasis = false,
  mono = false,
  indent = false,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "gold" | "good" | "warn" | "muted";
  emphasis?: boolean;
  mono?: boolean;
  indent?: boolean;
}) {
  const valueTone = {
    default: "text-ink",
    gold: "text-gold",
    good: "text-good",
    warn: "text-warn",
    muted: "text-ink-muted",
  }[tone];

  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2",
        indent && "pl-4",
      )}
    >
      <div className="min-w-0">
        <div
          className={cn(
            "text-[13px] leading-tight",
            emphasis ? "font-semibold text-ink" : "text-ink-muted",
          )}
        >
          {label}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[11px] leading-tight text-ink-subtle">{hint}</div>
        ) : null}
      </div>
      <div
        className={cn(
          "tnum shrink-0 text-right",
          mono && "font-mono",
          emphasis ? "text-[16px] font-semibold" : "text-[14px] font-medium",
          valueTone,
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-line", className)} />;
}
