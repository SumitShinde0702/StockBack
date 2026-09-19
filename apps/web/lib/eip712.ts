import type { Address, Hex } from "viem";
import { X_LAYER_TESTNET } from "./config";

/**
 * Canonical EIP-712 definition for a signed quote.
 * This must stay byte-for-byte identical to `StockBackRouter.QUOTE_TYPEHASH`.
 * Changing a field name or order here silently invalidates every onchain signature.
 */
export const QUOTE_TYPES = {
  Quote: [
    { name: "quoteId", type: "bytes32" },
    { name: "invoiceHash", type: "bytes32" },
    { name: "payer", type: "address" },
    { name: "merchant", type: "address" },
    { name: "payToken", type: "address" },
    { name: "rewardToken", type: "address" },
    { name: "merchantAmount", type: "uint256" },
    { name: "protocolFee", type: "uint256" },
    { name: "rewardFee", type: "uint256" },
    { name: "rewardUnits", type: "uint256" },
    { name: "expiry", type: "uint64" },
  ],
} as const;

export const EIP712_DOMAIN_NAME = "StockBack";
export const EIP712_DOMAIN_VERSION = "1";

export function quoteDomain(verifyingContract: Address) {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId: X_LAYER_TESTNET.id,
    verifyingContract,
  } as const;
}

export interface SignableQuote {
  quoteId: Hex;
  invoiceHash: Hex;
  payer: Address;
  merchant: Address;
  payToken: Address;
  rewardToken: Address;
  merchantAmount: bigint;
  protocolFee: bigint;
  rewardFee: bigint;
  rewardUnits: bigint;
  expiry: bigint;
}
