import { BPS_DENOMINATOR, PROTOCOL_BPS, REWARD_BPS } from "./config";
import { parseUnits } from "./format";

/**
 * All quote arithmetic is integer-only. Prices arrive from OKX as decimal strings and
 * are scaled to 1e18 before use, so a quote never depends on binary floating point.
 */
export const PRICE_SCALE = 10n ** 18n;

export interface QuoteInputs {
  /** Invoice amount in fiat minor units (SGD cents). */
  fiatMinorUnits: bigint;
  /** SGD per 1 USD, as a decimal string. */
  sgdPerUsd: string;
  /** USD per 1 pay token, as a decimal string. */
  payTokenUsdPrice: string;
  payTokenDecimals: number;
  /** USD per 1 reward token, as a decimal string. */
  rewardTokenUsdPrice: string;
  rewardTokenDecimals: number;
}

export interface QuoteBreakdown {
  /** Base units of the pay token routed to the merchant. */
  merchantUnits: bigint;
  /** 1.00% of base, retained as protocol reserve. */
  protocolUnits: bigint;
  /** 1.00% of base, which funds the cashback. */
  rewardFundingUnits: bigint;
  /** What the payer is actually debited: merchant + protocol + reward. */
  grossUnits: bigint;
  /** Base units of the xStock credited to the reward ledger. */
  rewardTokenUnits: bigint;
  /** Invoice value in USD minor units, for display only. */
  usdMinorUnits: bigint;
}

export class QuoteMathError extends Error {}

function requirePositive(value: bigint, label: string): bigint {
  if (value <= 0n) throw new QuoteMathError(`${label} must be greater than zero.`);
  return value;
}

export function computeQuote(inputs: QuoteInputs): QuoteBreakdown {
  const {
    fiatMinorUnits,
    payTokenDecimals,
    rewardTokenDecimals,
  } = inputs;

  if (fiatMinorUnits <= 0n) {
    throw new QuoteMathError("Invoice amount must be greater than zero.");
  }

  const sgdPerUsd = requirePositive(parseUnits(inputs.sgdPerUsd, 18), "FX rate");
  const payPrice = requirePositive(parseUnits(inputs.payTokenUsdPrice, 18), "Pay token price");
  const rewardPrice = requirePositive(
    parseUnits(inputs.rewardTokenUsdPrice, 18),
    "Reward token price",
  );

  const payScale = 10n ** BigInt(payTokenDecimals);
  const rewardScale = 10n ** BigInt(rewardTokenDecimals);

  // merchantUnits = (fiatMinor / 100) / sgdPerUsd / payPrice, carried in base units.
  const merchantUnits =
    (fiatMinorUnits * payScale * PRICE_SCALE * PRICE_SCALE) / (100n * sgdPerUsd * payPrice);

  if (merchantUnits <= 0n) {
    throw new QuoteMathError(
      "Invoice is too small to represent in this token's precision at the current price.",
    );
  }

  const protocolUnits = (merchantUnits * PROTOCOL_BPS) / BPS_DENOMINATOR;
  const rewardFundingUnits = (merchantUnits * REWARD_BPS) / BPS_DENOMINATOR;
  const grossUnits = merchantUnits + protocolUnits + rewardFundingUnits;

  // The reward budget, converted from pay-token units into xStock units.
  const rewardTokenUnits =
    (rewardFundingUnits * payPrice * rewardScale) / (payScale * rewardPrice);

  const usdMinorUnits = (fiatMinorUnits * PRICE_SCALE) / sgdPerUsd;

  return {
    merchantUnits,
    protocolUnits,
    rewardFundingUnits,
    grossUnits,
    rewardTokenUnits,
    usdMinorUnits,
  };
}

/** The invariant the router enforces onchain; asserted here before a quote is signed. */
export function assertQuoteInvariant(breakdown: QuoteBreakdown): void {
  const sum =
    breakdown.merchantUnits + breakdown.protocolUnits + breakdown.rewardFundingUnits;
  if (sum !== breakdown.grossUnits) {
    throw new QuoteMathError(
      `Quote split does not reconcile: ${sum} parts vs ${breakdown.grossUnits} gross.`,
    );
  }
}
