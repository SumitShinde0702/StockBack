import { Check, X } from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal } from "./reveal";
import { NOT_REAL, REAL } from "@/lib/landing-data";

export function Honesty() {
  return (
    <Section id="honesty">
      <SectionHeading
        eyebrow="Straight answers"
        title="What is real, and what is a demo stand-in."
        lede="A hackathon build that overstates itself is worth less than one that draws the line clearly. Here is the line."
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-card border border-good-dim bg-good/[0.04] p-6 sm:p-7">
            <h3 className="text-[15px] font-semibold text-ink">Real and running</h3>
            <ul className="mt-5 space-y-3.5">
              {REAL.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check size={16} className="mt-0.5 shrink-0 text-good" aria-hidden="true" />
                  <span className="text-[14px] leading-relaxed text-ink-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="h-full rounded-card border border-line bg-surface p-6 sm:p-7">
            <h3 className="text-[15px] font-semibold text-ink">Demo stand-ins, clearly labelled</h3>
            <ul className="mt-5 space-y-3.5">
              {NOT_REAL.map((item) => (
                <li key={item} className="flex gap-3">
                  <X size={16} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <span className="text-[14px] leading-relaxed text-ink-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
