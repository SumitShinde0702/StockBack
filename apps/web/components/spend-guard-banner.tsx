"use client";

import { CheckCircle2, CircleSlash, Info, ShieldOff } from "lucide-react";
import type { GuardDecision } from "@/lib/spend-guard";
import { Button } from "./ui/button";
import { cn } from "@/lib/cn";

const PRESENTATION = {
  permitted: { Icon: CheckCircle2, wrap: "border-good/30 bg-good/10", accent: "text-good" },
  blocked: { Icon: CircleSlash, wrap: "border-bad/40 bg-bad/10", accent: "text-bad" },
  "no-basis": { Icon: Info, wrap: "border-line bg-raised", accent: "text-ink-muted" },
  disabled: { Icon: ShieldOff, wrap: "border-line bg-raised", accent: "text-ink-subtle" },
} as const;

export function SpendGuardBanner({
  decision,
  overridden,
  onOverride,
  onOpenSettings,
}: {
  decision: GuardDecision;
  overridden: boolean;
  onOverride: () => void;
  onOpenSettings: () => void;
}) {
  const { Icon, wrap, accent } = PRESENTATION[decision.status];
  const showOverride = decision.requiresOverride && !overridden;

  return (
    <div className={cn("rounded-card border p-3.5", wrap)}>
      <div className="flex gap-2.5">
        <Icon size={17} className={cn("mt-px shrink-0", accent)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {/* The status is always stated in words, never signalled by colour alone. */}
          <p className="text-[13.5px] font-semibold text-ink">
            {overridden && decision.status === "blocked"
              ? "Spend Guard overridden"
              : decision.headline}
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-muted">{decision.detail}</p>

          {decision.unrealizedPct !== null ? (
            <p className="tnum mt-2 font-mono text-[11.5px] text-ink-subtle">
              mark ${decision.markPriceUsd?.toFixed(2)} · basis $
              {decision.costBasisUsd?.toFixed(2)} ·{" "}
              <span className={decision.unrealizedPct >= 0 ? "text-good" : "text-bad"}>
                {decision.unrealizedPct >= 0 ? "+" : ""}
                {decision.unrealizedPct.toFixed(2)}%
              </span>
            </p>
          ) : null}

          {showOverride ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="danger" onClick={onOverride}>
                Pay anyway
              </Button>
              <Button variant="ghost" onClick={onOpenSettings}>
                Adjust policy
              </Button>
            </div>
          ) : null}

          {decision.status === "no-basis" ? (
            <Button variant="ghost" className="mt-2 -ml-4" onClick={onOpenSettings}>
              Add cost basis
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
