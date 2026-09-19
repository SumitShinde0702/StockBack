import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

// The repo keeps one .env at the root so the web app and the contracts share addresses.
loadEnv({ path: resolve(__dirname, "../../.env") });
loadEnv({ path: resolve(__dirname, "../../.env.local"), override: true });

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = /^0x[0-9a-fA-F]{64}$/.test(deployerKey ?? "") ? [deployerKey as string] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // X Layer's zkEVM does not implement Cancun opcodes such as MCOPY, so the target is
      // pinned below solc 0.8.24's default. OpenZeppelin is pinned to a Paris-clean release
      // for the same reason.
      evmVersion: "paris",
    },
  },
  paths: {
    sources: "src",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    xlayerTestnet: {
      url: process.env.XLAYER_RPC_URL ?? "https://testrpc.xlayer.tech",
      chainId: 195,
      accounts,
    },
  },
};

export default config;
