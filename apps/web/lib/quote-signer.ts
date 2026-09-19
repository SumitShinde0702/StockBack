import "server-only";

import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import { CONTRACTS } from "./config";
import { QUOTE_TYPES, quoteDomain, type SignableQuote } from "./eip712";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

interface SignQuoteInput extends Omit<SignableQuote, "payer"> {
  payer: string | undefined;
}

export interface SignQuoteResult {
  signature: Hex | null;
  configured: boolean;
}

function loadSigner() {
  const key = process.env.QUOTE_SIGNER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  try {
    return privateKeyToAccount(key as Hex);
  } catch {
    return null;
  }
}

/**
 * Signs a quote so the router can verify the price and fee split it was handed.
 * Returns an unsigned result when the signer key or router address is absent, which is
 * the normal state before deployment; the UI then runs in preview-only mode.
 */
export async function signQuote(input: SignQuoteInput): Promise<SignQuoteResult> {
  const account = loadSigner();
  const routerConfigured = CONTRACTS.router !== ZERO;

  if (!account || !routerConfigured || !input.payer) {
    return { signature: null, configured: Boolean(account) && routerConfigured };
  }

  const message: SignableQuote = {
    quoteId: input.quoteId,
    invoiceHash: input.invoiceHash,
    payer: input.payer as Address,
    merchant: input.merchant,
    payToken: input.payToken,
    rewardToken: input.rewardToken,
    merchantAmount: input.merchantAmount,
    protocolFee: input.protocolFee,
    rewardFee: input.rewardFee,
    rewardUnits: input.rewardUnits,
    expiry: input.expiry,
  };

  const signature = await account.signTypedData({
    domain: quoteDomain(CONTRACTS.router),
    types: QUOTE_TYPES,
    primaryType: "Quote",
    message,
  });

  return { signature, configured: true };
}
