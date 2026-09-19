"use client";

import { useCallback } from "react";
import type { Address, Hex } from "viem";
import { CONTRACTS } from "./config";
import { describeSettlementError, erc20Abi, routerAbi } from "./router-abi";
import { useAppDispatch } from "./store";
import type { QuoteResponse } from "./quote-types";
import { publicClient, useWallet, xLayerTestnet } from "./wallet";

/**
 * Real settlement against the deployed router.
 *
 * Approve (only when the existing allowance is short) -> sign -> wait for the receipt ->
 * read the ledger back from the chain. The ledger figure shown after a payment is the
 * contract's own number, not a locally accumulated guess.
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

        if (allowance < gross) {
          dispatch({ type: "tx-status", status: "approving" });
          const approvalHash = await walletClient.writeContract({
            address: CONTRACTS.payToken,
            abi: erc20Abi,
            functionName: "approve",
            args: [CONTRACTS.router, gross],
            account: address,
            chain: xLayerTestnet,
          });
          const approval = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          if (approval.status !== "success") {
            dispatch({
              type: "tx-status",
              status: "failed",
              error: "The token approval reverted, so nothing was charged.",
            });
            return;
          }
        }

        dispatch({ type: "tx-status", status: "awaiting-signature" });

        // Simulating first turns most reverts into a clear message before the wallet opens.
        await publicClient.simulateContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "settle",
          args: [settleArgs, quote.signature as Hex],
          account: address,
        });

        const hash = await walletClient.writeContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "settle",
          args: [settleArgs, quote.signature as Hex],
          account: address,
          chain: xLayerTestnet,
        });

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
