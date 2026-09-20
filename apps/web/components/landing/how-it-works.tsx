import { Section, SectionHeading } from "./section";
import { Reveal } from "./reveal";
import { STEPS } from "@/lib/landing-data";

export function HowItWorks() {
  return (
    <Section id="how" className="border-y border-line bg-surface/40">
      <SectionHeading
        eyebrow="How it works"
        title="Six steps, and every one of them is checkable."
        lede="The interesting engineering is in what the contract refuses to take on trust — including from our own quote signer."
      />

      <ol className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <Reveal key={step.index} delay={(index % 3) * 0.07}>
            <li className="flex h-full flex-col bg-canvas p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="tnum font-mono text-[12px] font-semibold text-gold">
                  {step.index}
                </span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.015em] text-ink">
                {step.title}
              </h3>
              <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-ink-muted">
                {step.body}
              </p>
              <p className="mt-5 font-mono text-[11px] leading-snug text-chain">{step.tech}</p>
            </li>
          </Reveal>
        ))}
      </ol>

      <Reveal delay={0.1}>
        <div className="mt-6 rounded-card border border-line bg-canvas p-6 sm:p-8">
          <h3 className="text-[15px] font-semibold text-ink">
            Why the router recomputes its own fee split
          </h3>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-muted">
            Verifying the signature alone would make our off-chain signer fully trusted with
            your money. Instead the contract recalculates the 1% and 1% legs from the
            merchant amount and rejects the quote if they disagree. A leaked signing key
            could then affect prices, never proportions — and the invoice hash and quote ID
            each settle exactly once.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
