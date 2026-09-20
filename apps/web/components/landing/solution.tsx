import { Coins, ScanLine, ShieldCheck } from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal } from "./reveal";
import { SOLUTION } from "@/lib/landing-data";

const ICONS = [ScanLine, ShieldCheck, Coins];
const TONES = [
  { icon: "text-ink", ring: "ring-line-strong", bg: "bg-raised" },
  { icon: "text-bad", ring: "ring-bad-dim", bg: "bg-bad/10" },
  { icon: "text-gold", ring: "ring-gold-dim", bg: "bg-gold/10" },
];

export function Solution() {
  return (
    <Section id="solution">
      <SectionHeading
        eyebrow="The solution"
        title="Pay the code that already exists. Keep the upside."
        lede="StockBack sits entirely on the payer's side. The merchant keeps their label, their acquirer and their workflow, and never learns anything new."
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {SOLUTION.map((item, index) => {
          const Icon = ICONS[index];
          const tone = TONES[index];

          return (
            <Reveal key={item.title} delay={index * 0.08}>
              <article className="flex h-full flex-col rounded-card border border-line bg-surface p-6 transition-colors duration-200 ease-standard hover:border-line-strong sm:p-7">
                <span
                  className={`flex size-11 items-center justify-center rounded-control ring-1 ${tone.bg} ${tone.ring}`}
                >
                  <Icon size={19} className={tone.icon} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-[17.5px] font-semibold leading-snug tracking-[-0.015em] text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{item.body}</p>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.1}>
        <div className="mt-6 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
          {[
            { figure: "2%", caption: "disclosed spread, shown before you sign" },
            { figure: "1%", caption: "protocol reserve" },
            { figure: "1%", caption: "buys your cashback in tokenized stock" },
          ].map((item) => (
            <div key={item.caption} className="flex items-baseline gap-3 bg-surface px-6 py-5">
              <span className="tnum text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
                {item.figure}
              </span>
              <span className="text-[13px] leading-snug text-ink-muted">{item.caption}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
