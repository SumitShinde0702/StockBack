import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Container } from "./section";
import { Reveal } from "./reveal";
import { HeroDevice } from "./hero-device";

const PROOF = [
  { label: "Deployed on X Layer testnet", href: "#deployment" },
  { label: "Sample settlement on explorer", href: "#deployment" },
  { label: "Live OKX market data", href: null },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden canvas-glow">
      {/* Swiss grid rules, barely visible, to anchor the composition. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <Container className="relative">
        <div className="grid items-center gap-16 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20 lg:py-24">
          <div className="max-w-2xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11.5px] font-medium text-ink-muted">
                <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />
                OKX Dev Day 2026 · Build a Market
              </span>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-7 text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-6xl lg:text-[4.25rem]">
                Scan Singapore.
                <br />
                <span className="text-gold">Settle on X Layer.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-muted sm:text-[17.5px]">
                StockBack reads the SGQR code already sitting on the counter, settles the
                payment in crypto on X Layer, and returns 1% as fractional tokenized stock —
                funded by a disclosed 2% spread rather than a subsidy. If the payment would
                lock in a loss, it stops you first.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/app"
                  className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-card bg-gold px-6 text-[16px] font-semibold text-on-gold transition-[background-color,transform] duration-200 ease-standard hover:bg-gold/90 active:scale-[0.985]"
                >
                  Open the app
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex min-h-14 items-center justify-center rounded-card border border-line bg-raised px-6 text-[16px] font-semibold text-ink transition-[background-color,border-color] duration-200 ease-standard hover:border-line-strong hover:bg-overlay"
                >
                  See how it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5">
                {PROOF.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-[13px] text-ink-muted">
                    <CircleCheck size={14} className="text-good" aria-hidden="true" />
                    {item.href ? (
                      <a
                        href={item.href}
                        className="transition-colors duration-200 ease-standard hover:text-ink"
                      >
                        {item.label}
                      </a>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="mx-auto lg:mx-0">
            <HeroDevice />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
