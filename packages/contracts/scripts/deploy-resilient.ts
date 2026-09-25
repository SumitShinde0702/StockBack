import { config as loadEnv } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ContractFactory, Wallet, getAddress, isAddress, keccak256, toUtf8Bytes, dataSlice, type InterfaceAbi, type Contract } from "ethers";
import { normalizePrivateKey, operatorWallet, resilientProvider, withRetry } from "./rpc";

/**
 * Deploys DemoUSD (with EIP-2612), MockXNVDA, and StockBackRouter through the resilient
 * X Layer RPC wrapper. Hardhat's provider resets mid-deploy on this public endpoint.
 */

loadEnv({ path: resolve(__dirname, "../../../.env") });
loadEnv({ path: resolve(__dirname, "../../../.env.local"), override: true });

const MERCHANTS = [
  { proxyValue: "202401234K", label: "Ah Hock Kopitiam", env: "MERCHANT_A_ADDRESS" },
  { proxyValue: "199805678M", label: "Bras Basah Books", env: "MERCHANT_B_ADDRESS" },
  { proxyValue: "53401234X", label: "Maxwell Stall 42", env: "MERCHANT_C_ADDRESS" },
] as const;

const GAS = {
  demoUsd: 2_500_000n,
  mockXnvda: 1_800_000n,
  router: 4_500_000n,
  register: 200_000n,
} as const;

function artifact(relative: string): { abi: InterfaceAbi; bytecode: string } {
  return JSON.parse(readFileSync(resolve(__dirname, "../artifacts", relative), "utf8")) as {
    abi: InterfaceAbi;
    bytecode: string;
  };
}

function envAddress(name: string, fallback: string): string {
  const value = process.env[name];
  return value && isAddress(value) ? getAddress(value) : fallback;
}

async function main() {
  const quoteSignerKey = normalizePrivateKey(process.env.QUOTE_SIGNER_PRIVATE_KEY);
  if (!quoteSignerKey) {
    throw new Error("QUOTE_SIGNER_PRIVATE_KEY must be set so the router and /api/quote agree.");
  }

  const provider = resilientProvider();
  const deployer = operatorWallet(provider);
  const quoteSigner = new Wallet(quoteSignerKey).address;
  const treasury = envAddress("TREASURY_ADDRESS", deployer.address);
  const rewardFund = envAddress("REWARD_FUND_ADDRESS", deployer.address);

  const balance = await withRetry("balance", () => provider.getBalance(deployer.address));
  console.log(`deployer     ${deployer.address}`);
  console.log(`balance      ${balance}`);
  console.log(`quoteSigner  ${quoteSigner}`);
  if (balance === 0n) throw new Error("Deployer has no OKB. Fund it from the X Layer faucet.");

  const demoUsdArt = artifact("src/mocks/DemoUSD.sol/DemoUSD.json");
  const mockArt = artifact("src/mocks/MockXNVDA.sol/MockXNVDA.json");
  const routerArt = artifact("src/StockBackRouter.sol/StockBackRouter.json");

  const payToken = await withRetry("deploy DemoUSD", async () => {
    const factory = new ContractFactory(demoUsdArt.abi, demoUsdArt.bytecode, deployer);
    const contract = await factory.deploy({ gasLimit: GAS.demoUsd });
    await contract.waitForDeployment();
    return contract;
  });
  const payTokenAddress = await payToken.getAddress();
  console.log(`DemoUSD      ${payTokenAddress}`);

  const rewardToken = await withRetry("deploy MockXNVDA", async () => {
    const factory = new ContractFactory(mockArt.abi, mockArt.bytecode, deployer);
    const contract = await factory.deploy({ gasLimit: GAS.mockXnvda });
    await contract.waitForDeployment();
    return contract;
  });
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log(`MockXNVDA    ${rewardTokenAddress}`);

  const router = (await withRetry("deploy Router", async () => {
    const factory = new ContractFactory(routerArt.abi, routerArt.bytecode, deployer);
    const contract = await factory.deploy(
      deployer.address,
      payTokenAddress,
      rewardTokenAddress,
      treasury,
      rewardFund,
      quoteSigner,
      { gasLimit: GAS.router },
    );
    await contract.waitForDeployment();
    return contract;
  })) as Contract;
  const routerAddress = await router.getAddress();
  console.log(`Router       ${routerAddress}\n`);

  const merchants: Record<string, { label: string; settlement: string; identifierHash: string }> = {};

  for (const [index, merchant] of MERCHANTS.entries()) {
    const fallback = getAddress(dataSlice(keccak256(toUtf8Bytes(`stockback:${merchant.proxyValue}`)), 12));
    const settlement = envAddress(merchant.env, fallback);
    const identifierHash = keccak256(toUtf8Bytes(merchant.proxyValue));

    await withRetry(`register ${merchant.proxyValue}`, async () =>
      (await router.getFunction("registerMerchant")(identifierHash, settlement, { gasLimit: GAS.register })).wait(),
    );
    console.log(`merchant ${index + 1}    ${merchant.proxyValue} -> ${settlement}`);
    merchants[merchant.proxyValue] = { label: merchant.label, settlement, identifierHash };
  }

  const network = await provider.getNetwork();
  const record = {
    network: "xlayerTestnet",
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    router: routerAddress,
    payToken: payTokenAddress,
    rewardToken: rewardTokenAddress,
    quoteSigner,
    treasury,
    rewardFund,
    merchants,
    notes:
      "DemoUSD and MockXNVDA are test tokens. DemoUSD supports EIP-2612 permit for one-tx settlement. MockXNVDA is not an xStock.",
  };

  const outDir = resolve(__dirname, "../deployments");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, "xlayer-testnet.json");
  writeFileSync(outFile, `${JSON.stringify(record, null, 2)}\n`);

  console.log(`\nwrote ${outFile}`);
  console.log("\nAdd these to .env.local:");
  console.log(`NEXT_PUBLIC_ROUTER_ADDRESS=${routerAddress}`);
  console.log(`NEXT_PUBLIC_PAY_TOKEN_ADDRESS=${payTokenAddress}`);
  console.log(`NEXT_PUBLIC_REWARD_TOKEN_ADDRESS=${rewardTokenAddress}`);
  for (const [index, merchant] of MERCHANTS.entries()) {
    const key = ["NEXT_PUBLIC_MERCHANT_A", "NEXT_PUBLIC_MERCHANT_B", "NEXT_PUBLIC_MERCHANT_C"][index];
    console.log(`${key}=${merchants[merchant.proxyValue].settlement}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
