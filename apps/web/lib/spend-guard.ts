/**
 * Loss-aware Spend Guard.
 *
 * This is a client-side policy over a cost basis the user records themselves. It is not
 * a claim about their real portfolio, and the router does not independently verify it.
 * The contract cannot know a user's acquisition history, so the guard is presented as a
 * user-controlled preference with an explicit override, never as an onchain guarantee.
 */

export type GuardStatus = "permitted" | "blocked" | "no-basis" | "disabled";

export interface GuardInput {
  enabled: boolean;
  assetSymbol: string;
  /** Live USD mark for the pay asset. */
  markPriceUsd: number | null;
  /** USD cost basis the user recorded for this asset, or null if none. */
  costBasisUsd: number | null;
  /** Permitted drawdown before the guard intervenes, in basis points. */
  lossToleranceBps: number;
}

export interface GuardDecision {
  status: GuardStatus;
  /** Whether the payment may proceed without an explicit override. */
  allows: boolean;
  /** True only when the user must consciously override to continue. */
  requiresOverride: boolean;
  assetSymbol: string;
  markPriceUsd: number | null;
  costBasisUsd: number | null;
  /** Signed percentage change of mark against basis. */
  unrealizedPct: number | null;
  headline: string;
  detail: string;
}

export function evaluateSpendGuard(input: GuardInput): GuardDecision {
  const { enabled, assetSymbol, markPriceUsd, costBasisUsd, lossToleranceBps } = input;

  const base = {
    assetSymbol,
    markPriceUsd,
    costBasisUsd,
    unrealizedPct: null as number | null,
  };

  if (!enabled) {
    return {
      ...base,
      status: "disabled",
      allows: true,
      requiresOverride: false,
      headline: "Spend Guard is off",
      detail: `You turned the guard off, so ${assetSymbol} payments are never blocked.`,
    };
  }

  if (costBasisUsd === null || costBasisUsd <= 0) {
    return {
      ...base,
      status: "no-basis",
      allows: true,
      requiresOverride: false,
      headline: `No cost basis recorded for ${assetSymbol}`,
      detail: `Add what you paid per ${assetSymbol} in Settings and the guard can warn you before you spend at a loss.`,
    };
  }

  if (markPriceUsd === null || markPriceUsd <= 0) {
    return {
      ...base,
      status: "no-basis",
      allows: true,
      requiresOverride: false,
      headline: `No live price for ${assetSymbol}`,
      detail: "The guard needs a current mark to compare against your cost basis.",
    };
  }

  const unrealizedPct = ((markPriceUsd - costBasisUsd) / costBasisUsd) * 100;
  const tolerancePct = -(lossToleranceBps / 100);

  if (unrealizedPct >= tolerancePct) {
    const direction = unrealizedPct >= 0 ? "up" : "down";
    return {
      ...base,
      unrealizedPct,
      status: "permitted",
      allows: true,
      requiresOverride: false,
      headline: "Spend Guard passed",
      detail: `${assetSymbol} is ${direction} ${Math.abs(unrealizedPct).toFixed(2)}% against your recorded basis of $${costBasisUsd.toFixed(2)}.`,
    };
  }

  return {
    ...base,
    unrealizedPct,
    status: "blocked",
    allows: false,
    requiresOverride: true,
    headline: "Spend Guard blocked this payment",
    detail: `${assetSymbol} is down ${Math.abs(unrealizedPct).toFixed(2)}% against your recorded basis of $${costBasisUsd.toFixed(2)}. Spending now locks in that loss.`,
  };
}
