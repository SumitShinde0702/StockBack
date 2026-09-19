import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers, network } from "hardhat";

/**
 * Makes a deployed router demo-ready: mints test stablecoin to a wallet and deposits
 * reward backing so a claim actually pays out on camera.
 *
 * Usage: SEED_WALLET=0x... pnpm seed:xlayer
 */

interface Deployment {
  router: string;
  payToken: string;
  rewardToken: string;
}

const PAY_MINT = 5_000n * 10n ** 6n; // 5,000 dUSD
const REWARD_BACKING = 25n * 10n ** 18n; // 25 mXNVDA of backing

async function main() {
  const file = resolve(
    __dirname,
    "../deployments",
    network.name === "xlayerTestnet" ? "xlayer-testnet.json" : `${network.name}.json`,
  );
  const deployment = JSON.parse(readFileSync(file, "utf8")) as Deployment;

  const [operator] = await ethers.getSigners();
  const target = process.env.SEED_WALLET ?? (await operator.getAddress());
  if (!ethers.isAddress(target)) {
    throw new Error(`SEED_WALLET is not a valid address: ${target}`);
  }

  const payToken = await ethers.getContractAt("DemoUSD", deployment.payToken);
  const rewardToken = await ethers.getContractAt("MockXNVDA", deployment.rewardToken);
  const router = await ethers.getContractAt("StockBackRouter", deployment.router);

  console.log(`minting ${ethers.formatUnits(PAY_MINT, 6)} dUSD to ${target}`);
  await (await payToken.mint(target, PAY_MINT)).wait();

  console.log(`minting ${ethers.formatUnits(REWARD_BACKING, 18)} mXNVDA of reward backing`);
  await (await rewardToken.mint(await operator.getAddress(), REWARD_BACKING)).wait();
  await (await rewardToken.approve(deployment.router, REWARD_BACKING)).wait();
  await (await router.fundRewards(REWARD_BACKING)).wait();

  console.log(`\npay balance     ${ethers.formatUnits(await payToken.balanceOf(target), 6)} dUSD`);
  console.log(`reward backing  ${ethers.formatUnits(await router.rewardBacking(), 18)} mXNVDA`);
  console.log(`unbacked ledger ${ethers.formatUnits(await router.unbackedLiabilities(), 18)} mXNVDA`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
