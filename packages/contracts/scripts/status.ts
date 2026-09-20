import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { Contract, JsonRpcProvider, formatUnits } from "ethers";

/**
 * Prints the live state of the deployment: merchant registrations, reward backing and the
 * balances the demo depends on. Read-only, so it is safe to run at any time, including
 * right before a demo to confirm nothing has drifted.
 */

loadEnv({ path: resolve(__dirname, "../../../.env") });
loadEnv({ path: resolve(__dirname, "../../../.env.local"), override: true });

interface Deployment {
  chainId: number;
  router: string;
  payToken: string;
  rewardToken: string;
  quoteSigner: string;
  treasury: string;
  rewardFund: string;
  merchants: Record<string, { label: string; settlement: string; identifierHash: string }>;
}

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
];

const ROUTER_ABI = [
  "function rewardBacking() view returns (uint256)",
  "function rewardLiabilities() view returns (uint256)",
  "function unbackedLiabilities() view returns (uint256)",
  "function rewardLedger(address) view returns (uint256)",
  "function merchantEnabled(address) view returns (bool)",
  "function merchantByIdentifier(bytes32) view returns (address)",
  "function quoteSigner() view returns (address)",
];

async function main() {
  const deployment = JSON.parse(
    readFileSync(resolve(__dirname, "../deployments/xlayer-testnet.json"), "utf8"),
  ) as Deployment;

  const rpc = process.env.XLAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";
  const provider = new JsonRpcProvider(rpc, deployment.chainId, { staticNetwork: true });

  const payToken = new Contract(deployment.payToken, TOKEN_ABI, provider);
  const rewardToken = new Contract(deployment.rewardToken, TOKEN_ABI, provider);
  const router = new Contract(deployment.router, ROUTER_ABI, provider);

  const wallet = process.env.SEED_WALLET ?? deployment.treasury;

  console.log(`router          ${deployment.router}`);
  console.log(`pay token       ${deployment.payToken}`);
  console.log(`reward token    ${deployment.rewardToken}`);
  console.log(`quote signer    ${await router.quoteSigner()}`);
  console.log(`  matches file  ${(await router.quoteSigner()) === deployment.quoteSigner}\n`);

  console.log(`wallet          ${wallet}`);
  console.log(`  dUSD          ${formatUnits(await payToken.balanceOf(wallet), 6)}`);
  console.log(`  mXNVDA        ${formatUnits(await rewardToken.balanceOf(wallet), 18)}`);
  console.log(`  ledger credit ${formatUnits(await router.rewardLedger(wallet), 18)}\n`);

  console.log(`reward backing  ${formatUnits(await router.rewardBacking(), 18)} mXNVDA`);
  console.log(`liabilities     ${formatUnits(await router.rewardLiabilities(), 18)} mXNVDA`);
  console.log(`unbacked        ${formatUnits(await router.unbackedLiabilities(), 18)} mXNVDA`);
  console.log(
    `allowance       ${formatUnits(await rewardToken.allowance(wallet, deployment.router), 18)} mXNVDA\n`,
  );

  for (const [proxy, merchant] of Object.entries(deployment.merchants)) {
    const enabled = await router.merchantEnabled(merchant.settlement);
    const mapped = await router.merchantByIdentifier(merchant.identifierHash);
    const ok = enabled && mapped.toLowerCase() === merchant.settlement.toLowerCase();
    console.log(`merchant ${proxy.padEnd(11)} ${ok ? "registered" : "MISSING"}  ${merchant.label}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
