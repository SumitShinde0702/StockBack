import type { Address } from "viem";

/** X Layer testnet. Overridable so a judge can point the app at their own deployment. */
export const X_LAYER_TESTNET = {
  id: 1952,
  name: "X Layer testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrl: process.env.NEXT_PUBLIC_XLAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon",
  explorerUrl: "https://www.okx.com/web3/explorer/xlayer-test",
} as const;

export function explorerTx(hash: string) {
  return `${X_LAYER_TESTNET.explorerUrl}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${X_LAYER_TESTNET.explorerUrl}/address/${address}`;
}

const ZERO = "0x0000000000000000000000000000000000000000" as const;

function envAddress(value: string | undefined): Address {
  return (value && /^0x[0-9a-fA-F]{40}$/.test(value) ? value : ZERO) as Address;
}

/** Filled in by `packages/contracts` deployment; see docs/CONTRACTS.md. */
export const CONTRACTS = {
  router: envAddress(process.env.NEXT_PUBLIC_ROUTER_ADDRESS),
  payToken: envAddress(process.env.NEXT_PUBLIC_PAY_TOKEN_ADDRESS),
  rewardToken: envAddress(process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS),
} as const;

export const CONTRACTS_CONFIGURED =
  CONTRACTS.router !== ZERO && CONTRACTS.payToken !== ZERO && CONTRACTS.rewardToken !== ZERO;

/** The economics are fixed and disclosed; they are never hidden behind a tooltip. */
export const SPREAD_BPS = 200n; // 2.00% total
export const PROTOCOL_BPS = 100n; // 1.00% to protocol reserve
export const REWARD_BPS = 100n; // 1.00% funds the user's xStock cashback
export const BPS_DENOMINATOR = 10_000n;

/** Quotes are short-lived because they embed a live price. */
export const QUOTE_TTL_SECONDS = 90;
/** After this, the UI marks the price stale and re-quotes before allowing a signature. */
export const QUOTE_STALE_SECONDS = 60;

export interface PayAsset {
  symbol: string;
  name: string;
  /** OKX v5 instrument used for the live mark. */
  instId: string;
  /**
   * True when the instrument quotes the asset as the denominator, so the ticker must be
   * inverted to get a USD price. OKX lists USDC-USDT, not USDT-USDC.
   */
  invert?: boolean;
  decimals: number;
  /** Displayed precision for amounts of this asset. */
  displayDecimals: number;
}

/**
 * Only a stablecoin is settled onchain in this build: the router pulls one ERC-20.
 * The other assets are selectable so the Spend Guard can be demonstrated against a
 * volatile cost basis, which is the entire point of the policy.
 */
export const PAY_ASSETS: PayAsset[] = [
  {
    symbol: "USDT",
    name: "Tether USD",
    instId: "USDC-USDT",
    invert: true,
    decimals: 6,
    displayDecimals: 2,
  },
  { symbol: "ETH", name: "Ether", instId: "ETH-USDT", decimals: 18, displayDecimals: 6 },
  { symbol: "OKB", name: "OKB", instId: "OKB-USDT", decimals: 18, displayDecimals: 5 },
];

export interface RewardAsset {
  symbol: string;
  name: string;
  instId: string;
  decimals: number;
}

export const REWARD_ASSETS: RewardAsset[] = [
  { symbol: "XNVDA", name: "NVIDIA xStock", instId: "XNVDA-USDT", decimals: 18 },
  { symbol: "XAAPL", name: "Apple xStock", instId: "XAAPL-USDT", decimals: 18 },
  { symbol: "XTSLA", name: "Tesla xStock", instId: "XTSLA-USDT", decimals: 18 },
];

/** Minimum ledger balance before a user may pull rewards into self-custody. */
export const MIN_WITHDRAWAL_UNITS = 0.001;

/**
 * SGQR payloads identify a fiat scheme, never an EVM address. Settlement is therefore
 * only offered for merchants who have separately consented and registered an address.
 * Keyed by PayNow proxy value.
 */
export interface RegisteredMerchant {
  uen: string;
  displayName: string;
  category: string;
  settlementAddress: Address;
}

export const MERCHANT_REGISTRY: Record<string, RegisteredMerchant> = {
  "202401234K": {
    uen: "202401234K",
    displayName: "Ah Hock Kopitiam",
    category: "Coffee shop",
    settlementAddress: envAddress(process.env.NEXT_PUBLIC_MERCHANT_A),
  },
  "199805678M": {
    uen: "199805678M",
    displayName: "Bras Basah Books",
    category: "Bookstore",
    settlementAddress: envAddress(process.env.NEXT_PUBLIC_MERCHANT_B),
  },
  "53401234X": {
    uen: "53401234X",
    displayName: "Maxwell Stall 42",
    category: "Hawker stall",
    settlementAddress: envAddress(process.env.NEXT_PUBLIC_MERCHANT_C),
  },
};

export function lookupMerchant(proxyValue: string | null | undefined) {
  if (!proxyValue) return null;
  return MERCHANT_REGISTRY[proxyValue] ?? null;
}
