"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "./wallet";
import { QUOTE_STALE_SECONDS } from "./config";
import { useAppDispatch, useAppState } from "./store";
import type { QuoteErrorResponse, QuoteResponse } from "./quote-types";

/**
 * Fetches a priced, signed quote and marks it stale once the embedded price ages out.
 * A stale quote is never silently refreshed mid-review: the amount on screen must not
 * change under the user's finger while they are deciding.
 */
export function useQuote() {
  const { invoice, payAssetSymbol, settings, quoteStatus, quote } = useAppState();
  const dispatch = useAppDispatch();
  const { address } = useWallet();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const fetchQuote = useCallback(async () => {
    if (!invoice?.merchant || invoice.fiatMinorUnits === null) return;

    const requestId = ++requestIdRef.current;
    dispatch({ type: "quote-loading" });

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          proxyValue: invoice.payload.payNow?.proxyValue,
          fiatMinorUnits: invoice.fiatMinorUnits.toString(),
          payAssetSymbol,
          rewardAssetSymbol: settings.rewardAssetSymbol,
          invoiceRef: invoice.payload.raw,
          payerAddress: address,
        }),
      });

      // A superseded request must not overwrite a newer quote.
      if (requestId !== requestIdRef.current) return;

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as QuoteErrorResponse | null;
        dispatch({
          type: "quote-failed",
          error: body?.error ?? `Pricing failed with status ${response.status}.`,
        });
        return;
      }

      const body = (await response.json()) as QuoteResponse;
      if (requestId !== requestIdRef.current) return;
      dispatch({ type: "quote-ready", quote: body });
    } catch {
      if (requestId !== requestIdRef.current) return;
      dispatch({
        type: "quote-failed",
        error: "Could not reach the pricing service. Check your connection and retry.",
      });
    }
  }, [address, dispatch, invoice, payAssetSymbol, settings.rewardAssetSymbol]);

  const merchantKey = invoice?.merchant?.uen ?? null;
  const amountKey = invoice?.fiatMinorUnits?.toString() ?? null;

  useEffect(() => {
    if (merchantKey && amountKey) void fetchQuote();
    // Re-quote only when the priced inputs change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantKey, amountKey, payAssetSymbol, settings.rewardAssetSymbol, address]);

  useEffect(() => {
    if (!quote || quoteStatus === "loading") {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remaining = quote.issuedAt + QUOTE_STALE_SECONDS - Math.floor(Date.now() / 1000);
      setSecondsLeft(Math.max(0, remaining));
      if (remaining <= 0) dispatch({ type: "quote-stale" });
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [quote, quoteStatus, dispatch]);

  return { refetch: fetchQuote, secondsLeft };
}
