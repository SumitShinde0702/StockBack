import { ArrowUpRight } from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal } from "./reveal";
import { IMPACT_STATS } from "@/lib/landing-data";

export function Impact() {
  return (
    <Section id="impact" className="border-y border-line bg-surface/40">
      <SectionHeading
        eyebrow="The impact"
        title="The market is already there. Both halves of it."
        lede="Every figure below is published, dated and linked. Nothing here is estimated."
      />

      <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {IMPACT_STATS.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.07}>
            <article className="flex h-full flex-col bg-canvas p-6 sm:p-7">
              <p className="tnum text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-gold sm:text-[2.75rem]">
                {stat.value}
              </p>
              <h3 className="mt-4 text-[14.5px] font-semibold leading-snug text-ink">
                {stat.label}
              </h3>
              <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-ink-muted">
                {stat.detail}
              </p>
              <a
                href={stat.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-start gap-1 text-[11.5px] leading-snug text-ink-subtle transition-colors duration-200 ease-standard hover:text-chain"
              >
                <span>
                  {stat.source.name} · {stat.source.published}
                </span>
                <ArrowUpRight size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              </a>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
