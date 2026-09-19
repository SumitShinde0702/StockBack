"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Check, Coins, Link2, ScanLine } from "lucide-react";
import { Badge, RailBadge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CopyableHash } from "../ui/copyable-hash";
import { StatRow } from "../ui/stat-row";
import { useAppDispatch, useAppState } from "@/lib/store";
import { explorerTx } from "@/lib/config";
import { formatFiat } from "@/lib/format";

export function ReceiptScreen() {
  const { receipt } = useAppState();
  const dispatch = useAppDispatch();

  if (!receipt) return null;

  const { quote, txHash, rewardCredited } = receipt;
  const settledOnchain = txHash !== "0x";

  return (
    <div className="flex min-h-full flex-col pb-4">
      <div className="px-6 pt-8 text-center">
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-good/12 text-good"
        >
          <Check size={30} strokeWidth={2.6} aria-hidden="true" />
        </motion.span>

        <h1 className="mt-4 text-[21px] font-semibold tracking-[-0.02em] text-ink">
          {settledOnchain ? "Paid" : "Preview complete"}
        </h1>
        <p className="tnum mt-1 text-[15px] text-ink-muted">
          S${quote.fiat.display} to {quote.merchant.displayName}
        </p>

        {!settledOnchain ? (
          <Badge tone="warn" className="mt-3">
            Preview only · nothing settled onchain
          </Badge>
        ) : null}
      </div>

      {/*
        The three rails are deliberately separate cards. A viewer must be able to tell
        which fact is decoded data, which is a real onchain transfer, and which is a
        ledger credit, without reading the README.
      */}
      <div className="mt-7 space-y-3 px-4">
        <RailCard
          Icon={ScanLine}
          accent="text-ink-muted"
          title="SGQR decoded"
          rail="sgqr"
          footnote="Parsed locally from the EMVCo payload. No fiat moved through PayNow and the merchant's bank account was not touched."
        >
          <StatRow label="Merchant" value={quote.merchant.displayName} />
          <StatRow label="PayNow UEN" value={quote.merchant.uen} mono />
          <StatRow label="Invoice" value={`S$${quote.fiat.display}`} />
        </RailCard>

        <RailCard
          Icon={Link2}
          accent="text-chain"
          title={settledOnchain ? "Settled on X Layer" : "Would settle on X Layer"}
          rail="xlayer"
          footnote={
            settledOnchain
              ? "A single transaction moved the merchant's proceeds, the protocol reserve, and the cashback budget."
              : "No router is deployed in this environment, so no transaction was broadcast and no funds moved."
          }
        >
          <StatRow
            label="Merchant received"
            value={`${quote.legs.merchant.display} ${quote.payAsset.symbol}`}
          />
          <StatRow
            label="Spread 2.00%"
            value={`${quote.legs.protocol.display} + ${quote.legs.rewardFunding.display}`}
            tone="muted"
          />
          <StatRow
            emphasis
            label="You paid"
            value={`${quote.legs.gross.display} ${quote.payAsset.symbol}`}
          />
          {settledOnchain ? (
            <div className="flex items-center justify-between gap-3 pt-1.5">
              <span className="text-[13px] text-ink-muted">Transaction</span>
              <a
                href={explorerTx(txHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[12.5px] text-chain transition-colors duration-200 ease-standard hover:text-ink"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-6)}
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </RailCard>

        <RailCard
          Icon={Coins}
          accent="text-gold"
          title={rewardCredited ? "xStock cashback credited" : "xStock cashback previewed"}
          rail="reward"
          footnote={
            rewardCredited
              ? "Credited to your ledger against the treasury buffer. Withdraw to self-custody from the Rewards tab."
              : "This is what the ledger credit would be. No xStock was allocated, because no router is deployed here."
          }
        >
          <StatRow
            label={quote.reward.name}
            value={`${quote.reward.display} ${quote.reward.symbol}`}
            tone="gold"
            mono
          />
          <StatRow
            label="Worth about"
            value={`S$${formatFiat(BigInt(quote.reward.valueMinorUnits))}`}
            tone="muted"
          />
        </RailCard>

        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
            Invoice reference
          </p>
          <CopyableHash
            value={quote.invoiceHash}
            className="mt-1"
            ariaLabel="Copy invoice hash"
          />
          <p className="mt-1 text-[11.5px] leading-snug text-ink-subtle">
            A hash of the payload, so the receipt can be matched later without publishing
            the raw merchant code.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2 px-4">
        <Button block size="lg" onClick={() => dispatch({ type: "reset-flow" })}>
          Done
        </Button>
        <Button
          block
          variant="ghost"
          onClick={() => dispatch({ type: "set-tab", tab: "rewards" })}
        >
          View reward ledger
        </Button>
      </div>
    </div>
  );
}

function RailCard({
  Icon,
  accent,
  title,
  rail,
  footnote,
  children,
}: {
  Icon: typeof ScanLine;
  accent: string;
  title: string;
  rail: "sgqr" | "xlayer" | "reward";
  footnote: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-1">
        <div className="flex items-center gap-2">
          <Icon size={15} className={accent} aria-hidden="true" />
          <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
        </div>
        <RailBadge rail={rail} />
      </div>
      <div className="px-4 pb-2">{children}</div>
      <p className="border-t border-line px-4 py-2.5 text-[11.5px] leading-snug text-ink-subtle">
        {footnote}
      </p>
    </Card>
  );
}
