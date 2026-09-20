import { JsonRpcProvider, Network, Wallet, type JsonRpcPayload, type JsonRpcResult } from "ethers";

/**
 * The public X Layer testnet RPC resets a large fraction of connections at random. Hardhat's
 * built-in provider has no per-request retry, so a script that sends several transactions
 * reliably dies partway through. Everything that touches the network goes through this
 * provider instead, which retries each individual JSON-RPC request.
 */

const TRANSIENT =
  /ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|socket hang up|failed to detect network|network error|timeout|503|429/i;

function isTransient(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? "";
  const message = (error as { message?: string })?.message ?? "";
  return TRANSIENT.test(`${code} ${message}`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ResilientProvider extends JsonRpcProvider {
  async _send(payload: JsonRpcPayload | JsonRpcPayload[]): Promise<JsonRpcResult[]> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        return await super._send(payload);
      } catch (error) {
        if (!isTransient(error)) throw error;
        lastError = error;
        await sleep(Math.min(400 * 2 ** attempt, 5_000));
      }
    }

    throw lastError;
  }
}

export const X_LAYER_TESTNET_CHAIN_ID = 1952;

export function resilientProvider(): JsonRpcProvider {
  const url = process.env.XLAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";
  // A static network stops ethers from re-detecting the chain id on a flaky connection.
  return new ResilientProvider(url, new Network("xlayer-testnet", X_LAYER_TESTNET_CHAIN_ID), {
    staticNetwork: true,
    batchMaxCount: 1,
  });
}

/** Wallet exports are inconsistent about the 0x prefix, so accept either form. */
export function normalizePrivateKey(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return /^0x[0-9a-fA-F]{64}$/.test(prefixed) ? prefixed : null;
}

export function operatorWallet(provider: JsonRpcProvider): Wallet {
  const key = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
  if (!key) {
    throw new Error("DEPLOYER_PRIVATE_KEY is missing or malformed in .env.local.");
  }
  return new Wallet(key, provider);
}

/** Retries a whole operation, for the cases a single request retry cannot cover. */
export async function withRetry<T>(
  label: string,
  action: () => Promise<T>,
  attempts = 5,
): Promise<T> {
  let delay = 3_000;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      if (attempt === attempts || !isTransient(error)) throw error;
      console.log(`  ${label}: retrying in ${delay / 1000}s (${attempt}/${attempts - 1})`);
      await sleep(delay);
      delay = Math.min(delay * 2, 20_000);
    }
  }

  throw new Error(`${label} exhausted retries`);
}
