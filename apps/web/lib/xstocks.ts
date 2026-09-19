import type { Address } from "viem";

/**
 * Read-only provenance for the tokenized equities this app pays cashback in.
 *
 * Deliberately empty of hardcoded addresses. Official xStock contracts are issued by
 * Backed Finance and listed per chain; this build has not verified an xStock deployment on
 * X Layer testnet, so inventing an address here would be exactly the kind of claim the
 * submission promises not to make.
 *
 * If an official address is configured via env, the UI shows it read-only and says so. If
 * it is not, the UI says the ledger is denominated in a labelled mock and nothing more.
 */

export interface XStockReference {
  symbol: string;
  name: string;
  /** The equity the token is designed to track. */
  underlying: string;
  issuer: string;
  /** Where a judge can independently check the contract. Never a claim by this app. */
  reference: string;
  /** Official token address on X Layer, only when explicitly configured. */
  officialAddress: Address | null;
}

function officialAddress(value: string | undefined): Address | null {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : null;
}

const REFERENCES: Record<string, XStockReference> = {
  XNVDA: {
    symbol: "XNVDA",
    name: "NVIDIA xStock",
    underlying: "NVIDIA Corporation (NVDA)",
    issuer: "Backed Finance AG",
    reference: "https://backed.fi/products",
    officialAddress: officialAddress(process.env.NEXT_PUBLIC_XSTOCK_XNVDA),
  },
  XAAPL: {
    symbol: "XAAPL",
    name: "Apple xStock",
    underlying: "Apple Inc. (AAPL)",
    issuer: "Backed Finance AG",
    reference: "https://backed.fi/products",
    officialAddress: officialAddress(process.env.NEXT_PUBLIC_XSTOCK_XAAPL),
  },
  XTSLA: {
    symbol: "XTSLA",
    name: "Tesla xStock",
    underlying: "Tesla, Inc. (TSLA)",
    issuer: "Backed Finance AG",
    reference: "https://backed.fi/products",
    officialAddress: officialAddress(process.env.NEXT_PUBLIC_XSTOCK_XTSLA),
  },
};

export function lookupXStock(symbol: string): XStockReference | null {
  return REFERENCES[symbol.toUpperCase()] ?? null;
}

/**
 * What the reward token in this deployment actually is.
 * `mock` is the honest default: ledger and claim mechanics are real, the asset is not.
 */
export type RewardTokenProvenance = "official" | "mock";

export function rewardTokenProvenance(symbol: string): RewardTokenProvenance {
  return lookupXStock(symbol)?.officialAddress ? "official" : "mock";
}
