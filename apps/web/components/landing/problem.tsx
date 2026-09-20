import { Section, SectionHeading } from "./section";
import { Reveal } from "./reveal";
import { PROBLEM } from "@/lib/landing-data";

export function Problem() {
  return (
    <Section id="problem">
      <SectionHeading
        eyebrow="The problem"
        title={
          <>
            Two rails that never meet,
            <br className="hidden sm:block" /> and a sale nobody checks.
          </>
        }
        lede="Singapore solved merchant QR payments years ago. It solved them for fiat. Anyone holding crypto is left doing a manual, badly timed conversion every time they want to buy lunch."
      />

      <ol className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        {PROBLEM.map((item, index) => (
          <Reveal key={item.title} delay={index * 0.08}>
            <li className="flex h-full flex-col bg-surface p-6 sm:p-7">
              <span className="tnum font-mono text-[12px] font-medium text-gold">
                0{index + 1}
              </span>
              <h3 className="mt-4 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-ink">
                {item.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{item.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>

      <Reveal delay={0.1}>
        <p className="mt-12 max-w-3xl border-l-2 border-gold pl-6 text-[19px] leading-relaxed tracking-[-0.015em] text-ink sm:text-[22px]">
          You can buy a kopi with a QR code, and you can hold a portfolio on your phone. You
          just cannot do both at once without selling something first — usually at a price
          you did not choose.
        </p>
      </Reveal>
    </Section>
  );
}
