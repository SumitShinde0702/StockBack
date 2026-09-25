import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import { CONTRACTS } from "./config";
import { QUOTE_TYPES, quoteDomain, type SignableQuote } from "./eip712";

/**
 * Next inlines `process.env.FOO` from apps/web/.env* at compile time. The signer key
 * lives in the repo-root .env.local, so this reads that file at request time instead.
 */
function env(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;

  const files = [
    path.resolve(process.cwd(), "../../.env.local"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "../../../.env.local"),
  ];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

interface SignQuoteInput extends Omit<SignableQuote, "payer"> {
  payer: string | undefined;
}

export interface SignQuoteResult {
  signature: Hex | null;
  configured: boolean;
}

function loadSigner() {
  const raw = env("QUOTE_SIGNER_PRIVATE_KEY")?.trim();
  const key = raw?.startsWith("0x") ? raw : raw ? `0x${raw}` : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
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
