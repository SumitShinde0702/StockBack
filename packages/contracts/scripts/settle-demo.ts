import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { Contract, JsonRpcProvider, Wallet, formatUnits } from "ethers";
import { withRetry } from "./rpc";

/**
 * Drives one complete payment end to end against the live deployment: asks the running
 * quote API for a signed quote, approves, settles on X Layer, and prints the explorer
 * link plus the resulting ledger credit.
 *
 * This is the same path the browser takes. It exists so the settlement can be verified
 * without a wallet extension, and so the submission has a reproducible transaction.
 *
 * Usage: QUOTE_API=http://localhost:3100 ts-node scripts/settle-demo.ts
 */

loadEnv({ path: resolve(__dirname, "../../../.env") });
loadEnv({ path: resolve(__dirname, "../../../.env.local"), override: true });

interface Deployment {
  chainId: number;
  router: string;
  payToken: string;
  rewardToken: string;
}

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const ROUTER_ABI = [
  "function settle((bytes32 quoteId,bytes32 invoiceHash,address payer,address merchant,address payToken,address rewardToken,uint256 merchantAmount,uint256 protocolFee,uint256 rewardFee,uint256 rewardUnits,uint64 expiry) quote, bytes signature)",
  "function rewardLedger(address) view returns (uint256)",
];

const GAS = { approve: 80_000n, settle: 400_000n } as const;

function normalizePrivateKey(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return /^0x[0-9a-fA-F]{64}$/.test(prefixed) ? prefixed : null;
}

async function main() {
  const deployment = JSON.parse(
    readFileSync(resolve(__dirname, "../deployments/xlayer-testnet.json"), "utf8"),
  ) as Deployment;

  const key = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
  if (!key) throw new Error("DEPLOYER_PRIVATE_KEY is missing or malformed in .env.local");

  const rpc = process.env.XLAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";
  const api = process.env.QUOTE_API ?? "http://localhost:3100";
  const provider = new JsonRpcProvider(rpc, deployment.chainId, { staticNetwork: true });
  const payer = new Wallet(key, provider);

  console.log(`payer   ${payer.address}`);
  console.log(`api     ${api}/api/quote`);

  const response = await fetch(`${api}/api/quote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      proxyValue: "202401234K",
      fiatMinorUnits: "1250", // S$12.50
      payAssetSymbol: "USDT",
      rewardAssetSymbol: "XNVDA",
      invoiceRef: `demo-${Date.now()}`,
      payerAddress: payer.address,
    }),
  });

  if (!response.ok) {
    throw new Error(`Quote API returned ${response.status}: ${await response.text()}`);
  }

  const quote = (await response.json()) as {
    quoteId: `0x${string}`;
    invoiceHash: `0x${string}`;
    merchant: { displayName: string; settlementAddress: string };
    fiat: { display: string };
    legs: Record<"merchant" | "protocol" | "rewardFunding" | "gross", { units: string; display: string }>;
    reward: { units: string; display: string; symbol: string };
    payAsset: { priceSource: string };
    expiresAt: number;
    signature: `0x${string}` | null;
    signerConfigured: boolean;
    degraded: boolean;
  };

  if (!quote.signature) {
    throw new Error(
      `Quote came back unsigned (signerConfigured=${quote.signerConfigured}). The dev server needs QUOTE_SIGNER_PRIVATE_KEY and NEXT_PUBLIC_ROUTER_ADDRESS.`,
    );
  }

  console.log(`\ninvoice   ${quote.fiat.display} to ${quote.merchant.displayName}`);
  console.log(`merchant  ${quote.legs.merchant.display}`);
  console.log(`protocol  ${quote.legs.protocol.display}`);
  console.log(`reward    ${quote.legs.rewardFunding.display}`);
  console.log(`gross     ${quote.legs.gross.display}`);
  console.log(`cashback  ${quote.reward.display} ${quote.reward.symbol}`);
  console.log(`pricing   ${quote.payAsset.priceSource}${quote.degraded ? " (degraded)" : ""}\n`);

  const struct = {
    quoteId: quote.quoteId,
    invoiceHash: quote.invoiceHash,
    payer: payer.address,
    merchant: quote.merchant.settlementAddress,
    payToken: deployment.payToken,
    rewardToken: deployment.rewardToken,
    merchantAmount: BigInt(quote.legs.merchant.units),
    protocolFee: BigInt(quote.legs.protocol.units),
    rewardFee: BigInt(quote.legs.rewardFunding.units),
    rewardUnits: BigInt(quote.reward.units),
    expiry: BigInt(quote.expiresAt),
  };

  const gross = struct.merchantAmount + struct.protocolFee + struct.rewardFee;

  const payToken = new Contract(deployment.payToken, TOKEN_ABI, payer);
  const router = new Contract(deployment.router, ROUTER_ABI, payer);

  const allowance: bigint = await withRetry("read allowance", () =>
    payToken.allowance(payer.address, deployment.router),
  );
  if (allowance < gross) {
    console.log("approving router to move the payment token");
    await withRetry("approve", async () =>
      (await payToken.approve(deployment.router, gross, { gasLimit: GAS.approve })).wait(),
    );
  }

  console.log("settling on X Layer");
  const receipt = await withRetry("settle", async () => {
    const tx = await router.settle(struct, quote.signature, { gasLimit: GAS.settle });
    console.log(`  tx ${tx.hash}`);
    return tx.wait();
  });

  console.log(`\nsettled in block ${receipt.blockNumber}`);
  console.log(`explorer https://www.okx.com/web3/explorer/xlayer-test/tx/${receipt.hash}`);

  const credited: bigint = await withRetry("read ledger", () => router.rewardLedger(payer.address));
  console.log(`ledger credit ${formatUnits(credited, 18)} ${quote.reward.symbol}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
