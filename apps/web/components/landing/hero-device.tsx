import { Check, Coins, Link2, ScanLine } from "lucide-react";

const RAILS = [
  { Icon: ScanLine, label: "SGQR decoded", tone: "text-ink-muted" },
  { Icon: Link2, label: "Settled on X Layer", tone: "text-chain" },
  { Icon: Coins, label: "Cashback credited", tone: "text-gold" },
];

const LEGS = [
  { label: "Merchant receives", value: "12.500000" },
  { label: "Protocol reserve · 1%", value: "0.125000" },
  { label: "Cashback funding · 1%", value: "0.125000" },
];

/**
 * Static composition of the receipt screen, used as hero art.
 *
 * Presentational only: it is a faithful mock of the real UI, not a live render, and it is
 * hidden from assistive tech because every claim it makes is written out in the page copy.
 */
export function HeroDevice() {
  return (
    <div aria-hidden="true" className="relative select-none">
      <div className="absolute -inset-12 rounded-[4rem] bg-gold/8 blur-3xl" />
      <div className="absolute -inset-4 rounded-[3rem] bg-chain/5 blur-2xl" />

      <div className="relative h-[620px] w-[300px] overflow-hidden rounded-[2.5rem] border border-line-strong bg-canvas shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95)] sm:h-[680px] sm:w-[332px]">
        <div className="absolute left-1/2 top-2.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black/85" />

        <div className="flex h-full flex-col canvas-glow">
          <div className="flex items-center justify-between px-5 pb-3 pt-9">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-chain-dim bg-chain/10 px-2.5 py-1 text-[10.5px] font-medium text-chain">
              <span className="size-1.5 rounded-full bg-chain" />
              X Layer testnet
            </span>
            <span className="tnum font-mono text-[10.5px] text-ink-subtle">block 41,432,411</span>
          </div>

          <div className="flex flex-1 flex-col px-5">
            <div className="mt-5 flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-good/12 text-good ring-1 ring-good-dim">
                <Check size={26} strokeWidth={2.5} />
              </span>
              <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
                Paid
              </p>
              <p className="tnum mt-1 text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink">
                S$12.50
              </p>
              <p className="mt-2 text-[13px] text-ink-muted">Ah Hock Kopitiam · Coffee shop</p>
            </div>

            <div className="mt-6 space-y-1.5">
              {RAILS.map(({ Icon, label, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2.5"
                >
                  <Icon size={14} className={tone} />
                  <span className="text-[12.5px] font-medium text-ink">{label}</span>
                  <Check size={13} className="ml-auto text-good" />
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-card border border-line bg-surface px-3.5 py-3">
              {LEGS.map((leg) => (
                <div key={leg.label} className="flex items-baseline justify-between py-1.5">
                  <span className="text-[11.5px] text-ink-muted">{leg.label}</span>
                  <span className="tnum font-mono text-[11.5px] text-ink">{leg.value}</span>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2.5">
                <span className="text-[12px] font-semibold text-ink">You paid</span>
                <span className="tnum font-mono text-[13px] font-semibold text-ink">
                  12.750000 dUSD
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-card border border-gold-dim bg-gold/8 px-3.5 py-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-gold/80">
                  Cashback credited
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">worth about S$0.13</p>
              </div>
              <p className="tnum font-mono text-[15px] font-semibold text-gold">+0.000417</p>
            </div>

            <p className="mt-3 truncate font-mono text-[10.5px] text-ink-subtle">
              0xb93297b128d2cd14aad4c7334dbea833…
            </p>
          </div>

          <div className="mt-4 flex h-16 items-center justify-around border-t border-line bg-surface/90 px-6">
            {["Pay", "Rewards", "Settings"].map((tab, index) => (
              <span
                key={tab}
                className={`text-[10.5px] font-medium ${index === 0 ? "text-gold" : "text-ink-subtle"}`}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
