"use client";

import { useMemo } from "react";
import { AlertCircle, Code2, RefreshCw, Store } from "lucide-react";
import { AmountDisplay } from "../ui/amount-display";
import { Badge, RailBadge } from "../ui/badge";
import { Button } from "../ui/button";
import { Callout } from "../ui/callout";
import { Card, CardHeader } from "../ui/card";
import { Divider, StatRow } from "../ui/stat-row";
import { Skeleton } from "../ui/skeleton";
import { SegmentedControl } from "../ui/segmented-control";
import { StepHeader } from "../ui/step-header";
import { SpendGuardBanner } from "../spend-guard-banner";
import { TlvInspector } from "../tlv-inspector";
import { PAY_ASSETS } from "@/lib/config";
import { formatFiat } from "@/lib/format";
import { evaluateSpendGuard } from "@/lib/spend-guard";
import { useQuote } from "@/lib/use-quote";
import { useAppDispatch, useAppState } from "@/lib/store";
import { usePayment } from "@/lib/use-payment";

export function ReviewScreen() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { refetch, secondsLeft } = useQuote();
  const { submit, canSubmit, blockedReason } = usePayment();

  const { invoice, quote, quoteStatus, quoteError, payAssetSymbol, settings, guardOverridden } =
    state;

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

  if (!invoice) return null;

  const { payload, merchant } = invoice;
  const unregistered = merchant === null;

  return (
    <div className="flex min-h-full flex-col pb-4">
      <StepHeader
        title="Review payment"
        onBack={() => dispatch({ type: "back" })}
        action={
          <button
            onClick={() => dispatch({ type: "set-inspector", open: true })}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[11.5px] font-medium text-ink-muted transition-colors duration-200 ease-standard hover:border-line-strong hover:text-ink"
          >
            <Code2 size={12} aria-hidden="true" />
            Payload
          </button>
        }
      />

      <div className="flex-1 space-y-3.5 px-4">
        {/* Rail 1: what the QR told us. Decoded locally, no money moved. */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-raised text-ink-muted">
              <Store size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">
                {merchant?.displayName ?? payload.merchantName ?? "Unknown merchant"}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                {merchant?.category ?? payload.merchantCity ?? "Singapore"}
                {payload.payNow?.proxyValue ? ` · UEN ${payload.payNow.proxyValue}` : null}
              </p>
            </div>
            <RailBadge rail="sgqr" />
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                Invoice
              </p>
              <AmountDisplay
                currency="S$"
                amount={formatFiat(invoice.fiatMinorUnits ?? 0n)}
                className="mt-1"
              />
            </div>
            <Badge tone={payload.initiationMethod === "dynamic" ? "neutral" : "warn"}>
              {payload.initiationMethod === "dynamic" ? "Dynamic code" : "Amount you entered"}
            </Badge>
          </div>
        </Card>

        {unregistered ? (
          <Callout tone="bad" title="This merchant cannot be paid onchain">
            The code decoded correctly, but {payload.merchantName ?? "this merchant"} has not
            registered an X Layer settlement address. An SGQR payload names a fiat scheme, not a
            wallet, so StockBack will not invent a destination for it.
          </Callout>
        ) : (
          <>
            <div>
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
                Pay with
              </p>
              <SegmentedControl
                label="Payment asset"
                value={payAssetSymbol}
                onChange={(symbol) => dispatch({ type: "set-pay-asset", symbol })}
                options={PAY_ASSETS.map((asset) => ({
                  value: asset.symbol,
                  label: asset.symbol,
                  sublabel: asset.name,
                }))}
              />
            </div>

            <SpendGuardBanner
              decision={guard}
              overridden={guardOverridden}
              onOverride={() => dispatch({ type: "override-guard" })}
              onOpenSettings={() => dispatch({ type: "set-tab", tab: "settings" })}
            />

            {quoteStatus === "error" ? (
              <Callout
                tone="bad"
                title="Pricing failed"
                action={
                  <Button
                    variant="secondary"
                    onClick={() => void refetch()}
                    icon={<RefreshCw size={14} aria-hidden="true" />}
                  >
                    Retry
                  </Button>
                }
              >
                {quoteError}
              </Callout>
            ) : null}

            <QuoteCard secondsLeft={secondsLeft} onRefresh={() => void refetch()} />
          </>
        )}
      </div>

      {!unregistered ? (
        <div className="sticky bottom-0 mt-4 border-t border-line bg-canvas/95 px-4 pb-2 pt-3 backdrop-blur">
          <Button block size="lg" disabled={!canSubmit} onClick={() => void submit()}>
            {quote ? `Pay ${quote.legs.gross.display} ${payAssetSymbol}` : "Pay"}
          </Button>
          {blockedReason ? (
            <p className="mt-2 flex items-start gap-1.5 text-center text-[11.5px] leading-snug text-ink-subtle">
              <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
              <span className="text-left">{blockedReason}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <TlvInspector
        open={state.inspectorOpen}
        onClose={() => dispatch({ type: "set-inspector", open: false })}
        payload={payload}
      />
    </div>
  );
}

function QuoteCard({
  secondsLeft,
  onRefresh,
}: {
  secondsLeft: number | null;
  onRefresh: () => void;
}) {
  const { quote, quoteStatus, payAssetSymbol } = useAppState();

  if (quoteStatus === "loading" || (!quote && quoteStatus !== "error")) {
    return (
      <Card className="p-4">
        <Skeleton className="h-3 w-24" label="Pricing this payment" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <Skeleton className="mt-5 h-16 w-full" />
      </Card>
    );
  }

  if (!quote) return null;

  const stale = quoteStatus === "stale";
  const rewardValue = formatFiat(BigInt(quote.reward.valueMinorUnits));

  return (
    <>
      {/* Rail 2: the onchain debit. Every component is shown, never collapsed. */}
      <Card>
        <CardHeader
          title="What you pay"
          action={
            <div className="flex items-center gap-2">
              {quote.degraded ? <Badge tone="warn">Indicative price</Badge> : null}
              {stale ? (
                <Button variant="ghost" onClick={onRefresh} icon={<RefreshCw size={13} />}>
                  Refresh
                </Button>
              ) : secondsLeft !== null ? (
                <span className="tnum text-[11px] text-ink-subtle">
                  price held {secondsLeft}s
                </span>
              ) : null}
            </div>
          }
        />

        <div className="px-4 pb-3">
          <StatRow
            label="Merchant receives"
            value={`${quote.legs.merchant.display} ${payAssetSymbol}`}
            hint={`${quote.merchant.displayName} · ${quote.fiat.currency} ${quote.fiat.display}`}
          />
          <StatRow
            label="Spread 2.00%"
            value={`${quote.legs.protocol.display} + ${quote.legs.rewardFunding.display}`}
            hint="Split below. This is the only fee, and it funds your cashback."
            tone="muted"
          />
          <StatRow indent label="1.00% protocol reserve" value={quote.legs.protocol.display} tone="muted" />
          <StatRow
            indent
            label="1.00% your cashback budget"
            value={quote.legs.rewardFunding.display}
            tone="gold"
          />
          <Divider className="my-1.5" />
          <StatRow
            emphasis
            label="Total debit"
            value={`${quote.legs.gross.display} ${payAssetSymbol}`}
            hint={`1 ${payAssetSymbol} = $${Number(quote.payAsset.priceUsd).toLocaleString("en-US", { maximumFractionDigits: 4 })} · S$/US$ ${Number(quote.fx.sgdPerUsd).toFixed(4)}`}
          />
        </div>
      </Card>

      {/* Rail 3: the reward. A ledger credit, described as exactly that. */}
      <Card className="border-gold/25 bg-gold/[0.06]">
        <CardHeader title="You earn" action={<RailBadge rail="reward" />} />
        <div className="flex items-end justify-between gap-3 px-4 pb-4">
          <div>
            <p className="tnum font-mono text-[22px] font-semibold leading-none text-gold">
              {quote.reward.display}
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-muted">
              {quote.reward.symbol} · {quote.reward.name}
            </p>
          </div>
          <div className="text-right">
            <p className="tnum text-[13px] font-medium text-ink">≈ S${rewardValue}</p>
            <p className="mt-0.5 text-[11px] text-ink-subtle">
              at ${Number(quote.reward.priceUsd).toFixed(2)}
            </p>
          </div>
        </div>
        <p className="border-t border-gold/20 px-4 py-2.5 text-[11.5px] leading-snug text-ink-muted">
          Credited to your reward ledger against a pre-funded treasury buffer, not swapped
          onchain per transaction. Withdraw to self-custody once you clear the threshold.
        </p>
      </Card>

      {stale ? (
        <Callout tone="warn" title="Price is stale">
          This quote was priced more than a minute ago. Refresh before signing so you are not
          committing to an outdated rate.
        </Callout>
      ) : null}
    </>
  );
}
