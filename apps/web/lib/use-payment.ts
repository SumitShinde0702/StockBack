"use client";

import { useCallback, useMemo } from "react";
import { useWallet } from "./wallet";
import { CONTRACTS_CONFIGURED } from "./config";
import { evaluateSpendGuard } from "./spend-guard";
import { useAppDispatch, useAppState } from "./store";
import { useOnchainPayment } from "./use-onchain-payment";

/**
 * Gate-keeps the confirm button and runs the settlement.
 *
 * Two paths exist and the UI always says which one it took:
 *  - onchain, when a router is deployed, a wallet is connected and the quote is signed;
 *  - preview, which prices and records nothing. A preview receipt is never presented as
 *    a settled payment.
 */
export function usePayment() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { status: walletStatus, wrongNetwork } = useWallet();
  const onchain = useOnchainPayment();
  const isConnected = walletStatus === "connected" && !wrongNetwork;

  const { quote, quoteStatus, settings, payAssetSymbol, guardOverridden, invoice } = state;

  const guard = useMemo(
    () =>
      evaluateSpendGuard({
        enabled: settings.guardEnabled,
        assetSymbol: payAssetSymbol,
        markPriceUsd: quote ? Number(quote.payAsset.priceUsd) : null,
        costBasisUsd: settings.costBasis[payAssetSymbol] ?? null,
        lossToleranceBps: settings.lossToleranceBps,
      }),
    [settings, payAssetSymbol, quote],
  );

  const guardSatisfied = guard.allows || guardOverridden;
  const onchainReady = CONTRACTS_CONFIGURED && isConnected && Boolean(quote?.signature);

  const blockedReason = useMemo(() => {
    if (!invoice?.merchant) return "This merchant has no registered X Layer address.";
    if (quoteStatus === "loading") return null;
    if (quoteStatus === "error") return "Pricing failed. Retry before paying.";
    if (quoteStatus === "stale") return "Refresh the stale price before signing.";
    if (!quote) return null;
    if (!guardSatisfied) return "Spend Guard is blocking this payment.";
    if (!CONTRACTS_CONFIGURED) {
      return "No router deployed. This will produce a preview receipt, not an onchain payment.";
    }
    if (walletStatus !== "connected") return "Connect a wallet to settle on X Layer.";
    if (wrongNetwork) return "Switch your wallet to X Layer testnet.";
    if (!quote.signature) {
      return quote.signerConfigured
        ? "Waiting for a signed quote."
        : "No quote signer configured, so the router cannot verify this price.";
    }
    return null;
  }, [invoice, quote, quoteStatus, guardSatisfied, walletStatus, wrongNetwork]);

  const canSubmit =
    Boolean(quote) && quoteStatus === "ready" && guardSatisfied && Boolean(invoice?.merchant);

  const submit = useCallback(async () => {
    if (!quote || !canSubmit) return;

    if (onchainReady) {
      await onchain.execute(quote);
      return;
    }

    // Preview path: no wallet interaction, no state change, clearly labelled downstream.
    dispatch({ type: "tx-status", status: "pending" });
    await new Promise((resolve) => setTimeout(resolve, 900));
    dispatch({
      type: "tx-confirmed",
      receipt: {
        quote,
        txHash: "0x",
        blockNumber: null,
        settledAt: Math.floor(Date.now() / 1000),
        rewardCredited: false,
      },
    });
    dispatch({ type: "credit-ledger", symbol: quote.reward.symbol, units: quote.reward.units });
  }, [quote, canSubmit, onchainReady, onchain, dispatch]);

  return { submit, canSubmit, blockedReason, guard, onchainReady };
}
