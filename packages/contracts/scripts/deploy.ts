import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers, network } from "hardhat";
import { normalizePrivateKey } from "./rpc";

/**
 * Deploys the demo stack and writes an address file the web app reads.
 *
 * The pay token and reward token are both deliberately test tokens. See
 * docs/LIMITATIONS.md: the official xStock contracts are referenced read-only, and no
 * real tokenized equity is distributed by this deployment.
 */

const MERCHANTS = [
  { proxyValue: "202401234K", label: "Ah Hock Kopitiam", env: "MERCHANT_A_ADDRESS" },
  { proxyValue: "199805678M", label: "Bras Basah Books", env: "MERCHANT_B_ADDRESS" },
  { proxyValue: "53401234X", label: "Maxwell Stall 42", env: "MERCHANT_C_ADDRESS" },
] as const;

function envAddress(name: string, fallback: string): string {
  const value = process.env[name];
  return value && ethers.isAddress(value) ? ethers.getAddress(value) : fallback;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`network      ${network.name}`);
  console.log(`deployer     ${deployerAddress}`);
  console.log(`balance      ${ethers.formatEther(balance)} ${network.name === "xlayerTestnet" ? "OKB" : "ETH"}`);

  if (balance === 0n) {
    throw new Error(
      "Deployer has no balance. Fund it from the X Layer testnet faucet before deploying.",
    );
  }

  const quoteSignerKey = normalizePrivateKey(process.env.QUOTE_SIGNER_PRIVATE_KEY);
  if (!quoteSignerKey) {
    throw new Error(
      "QUOTE_SIGNER_PRIVATE_KEY must be set so the router and the /api/quote signer agree.",
    );
  }
  const quoteSigner = new ethers.Wallet(quoteSignerKey).address;

  const treasury = envAddress("TREASURY_ADDRESS", deployerAddress);
  const rewardFund = envAddress("REWARD_FUND_ADDRESS", deployerAddress);

  console.log(`quoteSigner  ${quoteSigner}`);
  console.log(`treasury     ${treasury}`);
  console.log(`rewardFund   ${rewardFund}\n`);

  const payToken = await (await ethers.getContractFactory("DemoUSD")).deploy();
  await payToken.waitForDeployment();
  console.log(`DemoUSD      ${await payToken.getAddress()}`);

  const rewardToken = await (await ethers.getContractFactory("MockXNVDA")).deploy();
  await rewardToken.waitForDeployment();
  console.log(`MockXNVDA    ${await rewardToken.getAddress()}`);

  const router = await (await ethers.getContractFactory("StockBackRouter")).deploy(
    deployerAddress,
    await payToken.getAddress(),
    await rewardToken.getAddress(),
    treasury,
    rewardFund,
    quoteSigner,
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`Router       ${routerAddress}\n`);

  const merchants: Record<string, { label: string; settlement: string; identifierHash: string }> = {};

  for (const [index, merchant] of MERCHANTS.entries()) {
    // Without a configured address, derive a deterministic demo address so the registry is
    // never left pointing at the zero address.
    const fallback = ethers.getAddress(
      ethers.dataSlice(ethers.keccak256(ethers.toUtf8Bytes(`stockback:${merchant.proxyValue}`)), 12),
    );
    const settlement = envAddress(merchant.env, fallback);
    const identifierHash = ethers.keccak256(ethers.toUtf8Bytes(merchant.proxyValue));

    const tx = await router.registerMerchant(identifierHash, settlement);
    await tx.wait();
    console.log(`merchant ${index + 1}    ${merchant.proxyValue} -> ${settlement}`);

    merchants[merchant.proxyValue] = { label: merchant.label, settlement, identifierHash };
  }

  const record = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    router: routerAddress,
    payToken: await payToken.getAddress(),
    rewardToken: await rewardToken.getAddress(),
    quoteSigner,
    treasury,
    rewardFund,
    merchants,
    notes:
      "DemoUSD and MockXNVDA are test tokens. MockXNVDA is not an xStock and carries no equity exposure.",
  };

  const outDir = resolve(__dirname, "../deployments");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(
    outDir,
    network.name === "xlayerTestnet" ? "xlayer-testnet.json" : `${network.name}.json`,
  );
  writeFileSync(outFile, `${JSON.stringify(record, null, 2)}\n`);

  console.log(`\nwrote ${outFile}`);
  console.log("\nAdd these to .env.local for apps/web:");
  console.log(`NEXT_PUBLIC_ROUTER_ADDRESS=${routerAddress}`);
  console.log(`NEXT_PUBLIC_PAY_TOKEN_ADDRESS=${await payToken.getAddress()}`);
  console.log(`NEXT_PUBLIC_REWARD_TOKEN_ADDRESS=${await rewardToken.getAddress()}`);
  for (const [index, merchant] of MERCHANTS.entries()) {
    const key = ["NEXT_PUBLIC_MERCHANT_A", "NEXT_PUBLIC_MERCHANT_B", "NEXT_PUBLIC_MERCHANT_C"][index];
    console.log(`${key}=${merchants[merchant.proxyValue].settlement}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
