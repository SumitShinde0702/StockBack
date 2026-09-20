import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Reveal } from "./reveal";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>
  );
}

export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-20 sm:py-28 lg:py-32", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-gold">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[2.75rem] lg:text-5xl">
        {title}
      </h2>
      {lede ? (
        <p className="mt-5 text-[15.5px] leading-relaxed text-ink-muted sm:text-[17px]">{lede}</p>
      ) : null}
    </Reveal>
  );
}
