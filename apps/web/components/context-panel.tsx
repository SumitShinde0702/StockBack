"use client";

import { ArrowUpRight, Coins, Link2, ScanLine, ShieldCheck } from "lucide-react";
import { CONTRACTS, CONTRACTS_CONFIGURED, X_LAYER_TESTNET, explorerAddress } from "@/lib/config";
import { shortAddress } from "@/lib/format";

const RAILS = [
  {
    Icon: ScanLine,
    tone: "text-ink-muted",
    title: "SGQR is decoded, not routed",
    body: "The EMVCo payload is parsed locally to read the merchant and invoice. No fiat moves through PayNow; settlement happens onchain with merchants who registered an address.",
  },
  {
    Icon: ShieldCheck,
    tone: "text-bad",
    title: "Spend Guard blocks loss-spending",
    body: "Before you can confirm, the app compares the live mark against a cost basis you recorded and blocks the payment when you would be locking in a loss. You can override it deliberately.",
  },
  {
    Icon: Link2,
    tone: "text-chain",
    title: "Settlement runs on X Layer",
    body: "One signed, expiring quote is verified onchain. The router splits the debit into merchant proceeds, a 1% protocol reserve, and a 1% cashback budget in a single transaction.",
  },
  {
    Icon: Coins,
    tone: "text-gold",
    title: "Cashback is a treasury-backed ledger",
    body: "Paying gas to swap pennies would cost more than the reward, so the router credits xStock units against a pre-funded buffer. You withdraw to self-custody once you clear the threshold.",
  },
];

export function ContextPanel() {
  return (
    <div className="max-w-xl py-12">
      <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11.5px] font-medium text-ink-muted">
        <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />
        OKX Dev Day 2026 · Build a Market
      </div>

      <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
        Scan Singapore.
        <br />
        <span className="text-gold">Settle on X Layer.</span>
      </h1>

      <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-muted">
        StockBack reads an existing SGQR merchant code, prices the payment against live OKX
        market data, and pays a registered merchant in crypto on X Layer. Every payment
        returns 1% as fractional tokenized stock, funded by the disclosed 2% spread rather
        than by subsidy.
      </p>

      <dl className="mt-10 space-y-5">
        {RAILS.map(({ Icon, tone, title, body }) => (
          <div key={title} className="flex gap-3.5">
            <Icon size={18} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
            <div>
              <dt className="text-[14px] font-semibold text-ink">{title}</dt>
              <dd className="mt-1 max-w-md text-[13.5px] leading-relaxed text-ink-muted">
                {body}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-10 rounded-card border border-line bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
          Deployment
        </p>
        {CONTRACTS_CONFIGURED ? (
          <a
            href={explorerAddress(CONTRACTS.router)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-mono text-[13px] text-chain transition-colors duration-200 ease-standard hover:text-ink"
          >
            {shortAddress(CONTRACTS.router, 10, 8)}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        ) : (
          <p className="mt-2 text-[13px] text-ink-muted">
            No router address configured. Set <code className="font-mono text-[12px] text-ink">NEXT_PUBLIC_ROUTER_ADDRESS</code>{" "}
            after deploying to {X_LAYER_TESTNET.name} to enable onchain settlement.
          </p>
        )}
      </div>
    </div>
  );
}
