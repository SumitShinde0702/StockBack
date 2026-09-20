import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

function normalizePrivateKey(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return /^0x[0-9a-fA-F]{64}$/.test(prefixed) ? prefixed : null;
}

/**
 * Throwaway probe for the public X Layer testnet RPC: it answers reads happily but has
 * been resetting the connection on writes. This isolates which JSON-RPC method fails.
 */

loadEnv({ path: resolve(__dirname, "../../../.env.local") });

const RPC = process.env.XLAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";
const PAY_TOKEN = "0xb2c9ee8E99D782aa2bF7C14484A6d7168819EE3E";

const abi = [
  "function mint(address to, uint256 amount)",
  "function balanceOf(address) view returns (uint256)",
];

async function step<T>(label: string, action: () => Promise<T>): Promise<T | null> {
  try {
    const result = await action();
    console.log(`ok    ${label}: ${String(result)}`);
    return result;
  } catch (error) {
    const e = error as { code?: string; shortMessage?: string; message?: string };
    console.log(`FAIL  ${label}: ${e.code ?? ""} ${e.shortMessage ?? e.message ?? ""}`);
    return null;
  }
}

async function main() {
  const key = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
  if (!key) throw new Error("DEPLOYER_PRIVATE_KEY missing or malformed");

  const provider = new JsonRpcProvider(RPC, 1952, { staticNetwork: true });
  const wallet = new Wallet(key, provider);
  const token = new Contract(PAY_TOKEN, abi, wallet);

  console.log(`rpc   ${RPC}`);
  await step("eth_blockNumber", () => provider.getBlockNumber());
  await step("eth_getTransactionCount", () => provider.getTransactionCount(wallet.address));
  await step("eth_gasPrice", async () => (await provider.getFeeData()).gasPrice?.toString() ?? "null");
  await step("eth_call balanceOf", async () =>
    (await token.balanceOf(wallet.address)).toString(),
  );
  await step("eth_estimateGas mint", async () =>
    (await token.mint.estimateGas(wallet.address, 1n)).toString(),
  );
  await step("eth_sendRawTransaction mint (fixed gas)", async () => {
    const tx = await token.mint(wallet.address, 1n, { gasLimit: 120_000n });
    return tx.hash;
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
