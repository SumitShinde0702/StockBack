import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "gold" | "good" | "warn" | "bad" | "chain";

const TONES: Record<Tone, string> = {
  neutral: "bg-raised text-ink-muted border-line",
  gold: "bg-gold/12 text-gold border-gold/30",
  good: "bg-good/12 text-good border-good/30",
  warn: "bg-warn/12 text-warn border-warn/30",
  bad: "bg-bad/12 text-bad border-bad/30",
  chain: "bg-chain/12 text-chain border-chain/30",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Rail badges exist so a viewer can tell which parts of the demo are real onchain
 * actions and which are locally decoded data. Do not reuse these tones elsewhere.
 *
 * SGQR is "Local · decoded" on purpose: Singapore's QR never carries an EVM address,
 * so parsing stays on-device. Settlement is the onchain rail.
 */
export function RailBadge({ rail }: { rail: "sgqr" | "xlayer" | "reward" }) {
  const copy = {
    sgqr: { label: "Local · decoded", tone: "neutral" as const },
    xlayer: { label: "Onchain · X Layer", tone: "chain" as const },
    reward: { label: "Ledger · xStock", tone: "gold" as const },
  }[rail];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}
