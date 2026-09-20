import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "./section";
import { Wordmark } from "./wordmark";

const LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#impact", label: "Impact" },
  { href: "#solution", label: "Solution" },
  { href: "#how", label: "How it works" },
  { href: "#demo", label: "On your phone" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="rounded-control transition-opacity duration-200 ease-standard hover:opacity-80"
          >
            <Wordmark />
          </Link>

          <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13.5px] font-medium text-ink-muted transition-colors duration-200 ease-standard hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-2 rounded-control bg-gold px-4 text-[14px] font-semibold text-on-gold transition-[background-color,transform] duration-200 ease-standard hover:bg-gold/90 active:scale-[0.985]"
          >
            Open the app
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </header>
  );
}
