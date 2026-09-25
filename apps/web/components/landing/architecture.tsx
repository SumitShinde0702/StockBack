import { ArrowDown, ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal } from "./reveal";

const FLOW = [
  {
    rail: "Local",
    tone: "neutral" as const,
    title: "Scan SGQR",
    body: "EMVCo TLV + CRC on the phone. The QR is an invoice, never a wallet address.",
  },
  {
    rail: "Off-chain",
    tone: "neutral" as const,
    title: "Price & sign",
    body: "Live OKX mark, Spend Guard check, EIP-712 quote signed by the quote signer.",
  },
  {
    rail: "On-chain",
    tone: "chain" as const,
    title: "Settle on X Layer",
    body: "MetaMask approve + StockBackRouter.settle. One tx, three transfers, replay-protected.",
  },
  {
    rail: "Ledger",
    tone: "gold" as const,
    title: "Credit cashback",
    body: "1% of the invoice funds the reward ledger. Withdraw when the buffer backs it.",
  },
] as const;

const TONE_CLASS = {
  neutral: "border-line bg-raised text-ink-muted",
  chain: "border-chain-dim bg-chain/10 text-chain",
  gold: "border-gold-dim bg-gold/10 text-gold",
} as const;

const SPLIT = [
  {
    share: "100%",
    of: "of invoice",
    label: "Merchant",
    detail: "PayNow merchant settlement address from the on-chain allowlist",
    bar: "w-[100%] bg-ink-muted",
    amount: "S$12.50",
  },
  {
    share: "1%",
    of: "of invoice",
    label: "Protocol reserve",
    detail: "Held by the treasury. Router recomputes this; the signer cannot change it",
    bar: "w-[8%] min-w-[2.5rem] bg-chain",
    amount: "S$0.125",
  },
  {
    share: "1%",
    of: "of invoice",
    label: "Cashback budget",
    detail: "Buys fractional reward units credited to your ledger",
    bar: "w-[8%] min-w-[2.5rem] bg-gold",
    amount: "S$0.125",
  },
] as const;

export function Architecture() {
  return (
    <Section id="architecture" className="border-y border-line bg-surface/40">
      <SectionHeading
        eyebrow="Architecture"
        title="What is local, what is signed, what settles on-chain."
        lede="SGQR decoding is deliberately off the chain — Singapore's QR never carries an EVM address. The money move is the on-chain step."
      />

      <Reveal>
        <ol className="mt-12 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-0">
          {FLOW.map((step, index) => (
            <li key={step.title} className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
              <article className="flex h-full flex-1 flex-col rounded-card border border-line bg-canvas p-5 sm:p-6">
                <span
                  className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] ${TONE_CLASS[step.tone]}`}
                >
                  {step.rail}
                </span>
                <h3 className="mt-3.5 text-[16px] font-semibold tracking-[-0.015em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
              </article>
              {index < FLOW.length - 1 ? (
                <span
                  className="flex items-center justify-center py-1 text-ink-subtle lg:w-9 lg:shrink-0 lg:px-0 lg:py-0"
                  aria-hidden="true"
                >
                  <ArrowDown size={16} className="lg:hidden" />
                  <ArrowRight size={16} className="hidden lg:block" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-10 rounded-card border border-line bg-canvas p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Fee split · one settle call
              </p>
              <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-ink sm:text-[20px]">
                You pay invoice + 2%. The router enforces the split.
              </h3>
            </div>
            <p className="font-mono text-[12px] text-ink-subtle">
              gross = merchant + 1% + 1%
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-12">
            <div aria-hidden="true" className="space-y-3">
              <div className="rounded-control border border-line bg-raised px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                  Payer wallet
                </p>
                <p className="tnum mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                  S$12.75
                </p>
                <p className="mt-0.5 text-[12px] text-ink-muted">DemoUSD debit on X Layer</p>
              </div>
              <div className="flex justify-center text-ink-subtle">
                <ArrowDown size={16} />
              </div>
              <div className="rounded-control border border-chain-dim bg-chain/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-chain">
                  StockBackRouter
                </p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Recomputes 1% / 1% from merchant amount. Rejects a bad quote.
                </p>
              </div>
              <div className="flex justify-center text-ink-subtle">
                <ArrowDown size={16} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Merchant", tone: "border-line bg-raised text-ink" },
                  { label: "Treasury", tone: "border-chain-dim bg-chain/10 text-chain" },
                  { label: "Reward", tone: "border-gold-dim bg-gold/10 text-gold" },
                ].map((leg) => (
                  <div
                    key={leg.label}
                    className={`rounded-control border px-2 py-2.5 text-center text-[11px] font-semibold ${leg.tone}`}
                  >
                    {leg.label}
                  </div>
                ))}
              </div>
            </div>

            <ul className="space-y-5">
              {SPLIT.map((leg) => (
                <li key={leg.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{leg.label}</p>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{leg.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[15px] font-semibold text-ink">{leg.share}</p>
                      <p className="text-[11px] text-ink-subtle">{leg.of}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-raised">
                    <div className={`h-full rounded-full ${leg.bar}`} />
                  </div>
                  <p className="tnum mt-1.5 text-[12px] text-ink-subtle">
                    e.g. Ah Hock S$12.50 → {leg.amount}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-muted">
            The 2% is paid by the payer on top of the invoice — not taken from the merchant. Demo
            figures above match a S$12.50 Ah Hock settlement; live quotes use the OKX mark.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
