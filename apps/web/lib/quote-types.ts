/** Wire format shared by the quote API route and the client. All amounts are strings. */

export interface QuoteLeg {
  /** Base units of the pay token. */
  units: string;
  /** Pre-formatted for display at the asset's precision. */
  display: string;
}

export interface QuoteResponse {
  quoteId: `0x${string}`;
  invoiceHash: `0x${string}`;

  merchant: {
    uen: string;
    displayName: string;
    category: string;
    settlementAddress: string;
  };

  fiat: {
    currency: string;
    minorUnits: string;
    display: string;
  };

  payAsset: {
    symbol: string;
    decimals: number;
    displayDecimals: number;
    priceUsd: string;
    priceSource: "okx" | "fallback";
  };

  fx: {
    sgdPerUsd: string;
    source: "okx" | "fallback";
  };

  legs: {
    merchant: QuoteLeg;
    protocol: QuoteLeg;
    rewardFunding: QuoteLeg;
    gross: QuoteLeg;
  };

  reward: {
    symbol: string;
    name: string;
    decimals: number;
    priceUsd: string;
    priceSource: "okx" | "fallback";
    units: string;
    display: string;
    /** Value of the cashback in SGD minor units, for the "worth about" line. */
    valueMinorUnits: string;
  };

  issuedAt: number;
  expiresAt: number;
  /** Absent until the router address is configured and the quote signer is set. */
  signature: `0x${string}` | null;
  signerConfigured: boolean;
  /** True when any input came from the pinned fallback table rather than OKX. */
  degraded: boolean;
}

export interface QuoteErrorResponse {
  error: string;
  code:
    | "INVALID_REQUEST"
    | "UNSUPPORTED_MERCHANT"
    | "UNSUPPORTED_ASSET"
    | "AMOUNT_TOO_SMALL"
    | "PRICING_UNAVAILABLE";
}
