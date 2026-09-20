import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { Impact } from "@/components/landing/impact";
import { Solution } from "@/components/landing/solution";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Honesty } from "@/components/landing/honesty";
import { PhoneCta } from "@/components/landing/phone-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "StockBack — pay any SGQR code in crypto, get 1% back in stock",
  description:
    "StockBack decodes Singapore's existing SGQR merchant codes, settles the payment on X Layer, and returns 1% as fractional tokenized stock. Spend Guard blocks payments that would lock in a loss.",
};

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <>
      <a
        href="#problem"
        className="absolute left-4 top-4 z-[60] -translate-y-16 rounded-control bg-gold px-4 py-2.5 text-[14px] font-semibold text-on-gold opacity-0 transition-[transform,opacity] duration-200 ease-standard focus:translate-y-0 focus:opacity-100"
      >
        Skip to content
      </a>
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <Impact />
        <Solution />
        <HowItWorks />
        <Honesty />
        <PhoneCta />
      </main>
      <LandingFooter />
    </>
  );
}
