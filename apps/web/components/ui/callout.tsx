import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "good" | "warn" | "bad";

const TONES: Record<Tone, { wrap: string; icon: ReactNode }> = {
  info: {
    wrap: "border-line bg-raised text-ink-muted",
    icon: <Info size={16} className="text-chain" aria-hidden="true" />,
  },
  good: {
    wrap: "border-good/30 bg-good/10 text-ink",
    icon: <CheckCircle2 size={16} className="text-good" aria-hidden="true" />,
  },
  warn: {
    wrap: "border-warn/30 bg-warn/10 text-ink",
    icon: <AlertTriangle size={16} className="text-warn" aria-hidden="true" />,
  },
  bad: {
    wrap: "border-bad/35 bg-bad/10 text-ink",
    icon: <ShieldAlert size={16} className="text-bad" aria-hidden="true" />,
  },
};

export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div className={cn("rounded-card border p-3.5", t.wrap, className)}>
      <div className="flex gap-2.5">
        <span className="mt-px shrink-0">{t.icon}</span>
        <div className="min-w-0 flex-1">
          {/* Never rely on colour alone: the title always states the condition. */}
          <p className="text-[13px] font-semibold text-ink">{title}</p>
          {children ? (
            <div className="mt-1 text-[12.5px] leading-[1.5] text-ink-muted">{children}</div>
          ) : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
