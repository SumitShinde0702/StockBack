"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTRACTS, CONTRACTS_CONFIGURED } from "./config";
import { describeSettlementError, routerAbi } from "./router-abi";
import { useAppDispatch, useAppState } from "./store";
import { publicClient, useWallet, xLayerTestnet } from "./wallet";

export interface RewardChainState {
  /** Ledger credit for the connected wallet, in reward-token base units. */
  credited: bigint;
  /** Reward tokens the router actually holds. */
  backing: bigint;
  /** Credit across all payers that is not yet covered by tokens. */
  unbacked: bigint;
}

type ClaimStatus = "idle" | "pending" | "done" | "error";

/**
 * Reads the reward ledger straight from the router and claims from it.
 *
 * Backing is surfaced alongside the balance because a credited reward is not the same
 * thing as a funded one, and the UI says so rather than implying the tokens are already
 * sitting there.
 */
export function useRewards() {
  const { address, status: walletStatus, wrongNetwork, getWalletClient } = useWallet();
  const { receipt } = useAppState();
  const dispatch = useAppDispatch();

  const [chain, setChain] = useState<RewardChainState | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [claimError, setClaimError] = useState<string | null>(null);

  const connected = walletStatus === "connected" && !wrongNetwork && Boolean(address);
  const live = CONTRACTS_CONFIGURED && connected;

  const refresh = useCallback(async () => {
    if (!live || !address) {
      setChain(null);
      return;
    }
    setLoading(true);
    try {
      const [credited, backing, unbacked] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "rewardLedger",
          args: [address],
        }),
        publicClient.readContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "rewardBacking",
        }),
        publicClient.readContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "unbackedLiabilities",
        }),
      ]);
      setChain({ credited, backing, unbacked });
    } catch {
      // A read failure is not worth an alarming banner; the screen falls back to the
      // locally mirrored ledger and labels itself as such.
      setChain(null);
    } finally {
      setLoading(false);
    }
  }, [live, address]);

  useEffect(() => {
    void refresh();
    // Re-read after a settlement so the balance on this tab is never a stale mirror.
  }, [refresh, receipt?.txHash]);

  const claim = useCallback(
    async (symbol: string, amount: bigint) => {
      const walletClient = getWalletClient();
      if (!walletClient || !address || amount <= 0n) return;

      setClaimStatus("pending");
      setClaimError(null);
      try {
        const hash = await walletClient.writeContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "claimRewards",
          args: [amount],
          account: address,
          chain: xLayerTestnet,
        });
        const txReceipt = await publicClient.waitForTransactionReceipt({ hash });
        if (txReceipt.status !== "success") {
          setClaimStatus("error");
          setClaimError("The withdrawal reverted. Your ledger balance is unchanged.");
          return;
        }
        setClaimStatus("done");
        await refresh();

        // Mirror whatever the contract says is left, so a partial claim stays accurate.
        const remaining = await publicClient.readContract({
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "rewardLedger",
          args: [address],
        });
        dispatch({ type: "set-ledger", ledger: { [symbol]: remaining.toString() } });
      } catch (error) {
        setClaimStatus("error");
        setClaimError(describeSettlementError(error).message);
      }
    },
    [address, dispatch, getWalletClient, refresh],
  );

  return { chain, loading, live, connected, claim, claimStatus, claimError, refresh };
}
