import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, JsonRpcProvider, Wallet, formatUnits, isAddress } from "ethers";
import { withRetry } from "./rpc";

/**
 * Makes a deployed router demo-ready: mints test stablecoin to a wallet and deposits
 * reward backing so a claim actually pays out on camera.
 *
 * Usage: SEED_WALLET=0x... pnpm seed:xlayer
 *
 * This script talks to the RPC through plain ethers rather than the Hardhat provider.
 * Hardhat's provider resets the connection against the public X Layer testnet endpoint on
 * every write; a static-network ethers provider with explicit gas limits does not.
 */

loadEnv({ path: resolve(__dirname, "../../../.env") });
loadEnv({ path: resolve(__dirname, "../../../.env.local"), override: true });

interface Deployment {
  chainId: number;
  router: string;
  payToken: string;
  rewardToken: string;
}

const PAY_MINT = 5_000n * 10n ** 6n; // 5,000 dUSD
const REWARD_BACKING = 25n * 10n ** 18n; // 25 mXNVDA of backing

// The public endpoint rejects gas estimation under load, so every write carries a limit.
const GAS = { mint: 120_000n, approve: 80_000n, fund: 160_000n } as const;

function normalizePrivateKey(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return /^0x[0-9a-fA-F]{64}$/.test(prefixed) ? prefixed : null;
}

const TOKEN_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

const ROUTER_ABI = [
  "function fundRewards(uint256 amount)",
  "function rewardBacking() view returns (uint256)",
  "function rewardLiabilities() view returns (uint256)",
  "function unbackedLiabilities() view returns (uint256)",
];

async function main() {
  const deployment = JSON.parse(
    readFileSync(resolve(__dirname, "../deployments/xlayer-testnet.json"), "utf8"),
  ) as Deployment;

  const key = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
  if (!key) throw new Error("DEPLOYER_PRIVATE_KEY is missing or malformed in .env.local");

  const rpc = process.env.XLAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";
  const provider = new JsonRpcProvider(rpc, deployment.chainId, { staticNetwork: true });
  const operator = new Wallet(key, provider);

  const target = process.env.SEED_WALLET ?? operator.address;
  if (!isAddress(target)) throw new Error(`SEED_WALLET is not a valid address: ${target}`);

  const payToken = new Contract(deployment.payToken, TOKEN_ABI, operator);
  const rewardToken = new Contract(deployment.rewardToken, TOKEN_ABI, operator);
  const router = new Contract(deployment.router, ROUTER_ABI, operator);

  console.log(`rpc       ${rpc}`);
  console.log(`operator  ${operator.address}`);
  console.log(`target    ${target}\n`);

  // Each step is skipped when the chain already satisfies it, so a half-finished run can
  // simply be repeated.
  const payBalance: bigint = await withRetry("read dUSD", () => payToken.balanceOf(target));
  if (payBalance < PAY_MINT) {
    console.log(`minting ${formatUnits(PAY_MINT, 6)} dUSD`);
    await withRetry("mint dUSD", async () =>
      (await payToken.mint(target, PAY_MINT, { gasLimit: GAS.mint })).wait(),
    );
  } else {
    console.log(`dUSD balance already sufficient (${formatUnits(payBalance, 6)}), skipping`);
  }

  const backing: bigint = await withRetry("read backing", () => router.rewardBacking());
  if (backing < REWARD_BACKING) {
    const shortfall = REWARD_BACKING - backing;
    console.log(`funding ${formatUnits(shortfall, 18)} mXNVDA of reward backing`);
    await withRetry("mint mXNVDA", async () =>
      (await rewardToken.mint(operator.address, shortfall, { gasLimit: GAS.mint })).wait(),
    );
    await withRetry("approve router", async () =>
      (await rewardToken.approve(deployment.router, shortfall, { gasLimit: GAS.approve })).wait(),
    );
    await withRetry("fund rewards", async () =>
      (await router.fundRewards(shortfall, { gasLimit: GAS.fund })).wait(),
    );
  } else {
    console.log(`reward backing already sufficient (${formatUnits(backing, 18)}), skipping`);
  }

  // Reads can land on a node that trails the block just mined, so the summary polls until
  // it sees the state this run created rather than reporting a stale zero.
  const settled = async <T>(label: string, read: () => Promise<T>, expected: (value: T) => boolean) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const value = await withRetry(label, read);
      if (expected(value)) return value;
      await new Promise((r) => setTimeout(r, 2_000));
    }
    return withRetry(label, read);
  };

  const finalPay = await settled("read dUSD", () => payToken.balanceOf(target), (v: bigint) => v >= PAY_MINT);
  const finalBacking = await settled("read backing", () => router.rewardBacking(), (v: bigint) => v >= REWARD_BACKING);
  const unbacked: bigint = await withRetry("read unbacked", () => router.unbackedLiabilities());

  console.log(`\npay balance     ${formatUnits(finalPay, 6)} dUSD`);
  console.log(`reward backing  ${formatUnits(finalBacking, 18)} mXNVDA`);
  console.log(`unbacked ledger ${formatUnits(unbacked, 18)} mXNVDA`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
