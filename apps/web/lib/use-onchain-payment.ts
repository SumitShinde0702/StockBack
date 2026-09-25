"use client";

import { useCallback } from "react";
import type { Address, Hex } from "viem";
import { hexToSignature, maxUint256 } from "viem";
import { CONTRACTS, X_LAYER_TESTNET } from "./config";
import { describeSettlementError, erc20Abi, routerAbi } from "./router-abi";
import { useAppDispatch } from "./store";
import type { QuoteResponse } from "./quote-types";
import { publicClient, useWallet, xLayerTestnet } from "./wallet";

const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/**
 * Real settlement against the deployed router.
 *
 * Fast path: if allowance already covers the debit, one `settle` tx.
 * Cold path: EIP-2612 permit signature + `settleWithPermit` in a single mined
 * transaction — no separate approve wait (that was causing InsufficientAllowance
 * when MetaMask settled before the approve receipt landed).
 */
export function useOnchainPayment() {
  const dispatch = useAppDispatch();
  const { address, getWalletClient } = useWallet();

  const execute = useCallback(
    async (quote: QuoteResponse) => {
      const walletClient = getWalletClient();

      if (!walletClient || !address) {
        dispatch({
          type: "tx-status",
          status: "failed",
          error: "Wallet disconnected before the payment could be sent.",
        });
        return;
      }

      if (!quote.signature) {
        dispatch({
          type: "tx-status",
          status: "failed",
          error: "This quote is unsigned, so the router cannot verify the price.",
        });
        return;
      }

      const merchantAmount = BigInt(quote.legs.merchant.units);
      const protocolFee = BigInt(quote.legs.protocol.units);
      const rewardFee = BigInt(quote.legs.rewardFunding.units);
      const gross = merchantAmount + protocolFee + rewardFee;

      const settleArgs = {
        quoteId: quote.quoteId,
        invoiceHash: quote.invoiceHash,
        payer: address,
        merchant: quote.merchant.settlementAddress as Address,
        payToken: CONTRACTS.payToken,
        rewardToken: CONTRACTS.rewardToken,
        merchantAmount,
        protocolFee,
        rewardFee,
        rewardUnits: BigInt(quote.reward.units),
        expiry: BigInt(quote.expiresAt),
      } as const;

      try {
        const allowance = await publicClient.readContract({
          address: CONTRACTS.payToken,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, CONTRACTS.router],
        });

        let hash: Hex;

        if (allowance >= gross) {
          dispatch({ type: "tx-status", status: "awaiting-signature" });

          await publicClient.simulateContract({
            address: CONTRACTS.router,
            abi: routerAbi,
            functionName: "settle",
            args: [settleArgs, quote.signature as Hex],
            account: address,
          });

          hash = await walletClient.writeContract({
            address: CONTRACTS.router,
            abi: routerAbi,
            functionName: "settle",
            args: [settleArgs, quote.signature as Hex],
            account: address,
            chain: xLayerTestnet,
          });
        } else {
          // Sign permit off-chain (instant), then settleWithPermit mines once.
          dispatch({ type: "tx-status", status: "approving" });

          const nonce = await publicClient.readContract({
            address: CONTRACTS.payToken,
            abi: erc20Abi,
            functionName: "nonces",
            args: [address],
          });
          const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

          const permitSignature = await walletClient.signTypedData({
            account: address,
            domain: {
              name: "StockBack Demo USD",
              version: "1",
              chainId: X_LAYER_TESTNET.id,
              verifyingContract: CONTRACTS.payToken,
            },
            types: PERMIT_TYPES,
            primaryType: "Permit",
            message: {
              owner: address,
              spender: CONTRACTS.router,
              value: maxUint256,
              nonce,
              deadline,
            },
          });
          const { v, r, s } = hexToSignature(permitSignature);

          dispatch({ type: "tx-status", status: "awaiting-signature" });

          await publicClient.simulateContract({
            address: CONTRACTS.router,
            abi: routerAbi,
            functionName: "settleWithPermit",
            args: [
              settleArgs,
              quote.signature as Hex,
              maxUint256,
              deadline,
              Number(v),
              r,
              s,
            ],
            account: address,
          });

          hash = await walletClient.writeContract({
            address: CONTRACTS.router,
            abi: routerAbi,
            functionName: "settleWithPermit",
            args: [
              settleArgs,
              quote.signature as Hex,
              maxUint256,
              deadline,
              Number(v),
              r,
              s,
            ],
            account: address,
            chain: xLayerTestnet,
          });
        }

        dispatch({ type: "tx-status", status: "pending", hash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          dispatch({
            type: "tx-status",
            status: "failed",
            error: "X Layer included the transaction but it reverted. No funds moved.",
          });
          return;
        }

        const credited = await publicClient.readContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "rewardLedger",
          args: [address],
        });

        dispatch({
          type: "tx-confirmed",
          receipt: {
            quote,
            txHash: hash,
            blockNumber: receipt.blockNumber.toString(),
            settledAt: Math.floor(Date.now() / 1000),
            rewardCredited: true,
          },
        });
        dispatch({ type: "set-ledger", ledger: { [quote.reward.symbol]: credited.toString() } });
      } catch (error) {
        const { status, message } = describeSettlementError(error);
        dispatch({ type: "tx-status", status, error: message });
      }
    },
    [address, dispatch, getWalletClient],
  );

  return { execute };
}
