import Link from "next/link";
import { Container } from "./section";
import { Wordmark } from "./wordmark";

export function LandingFooter() {
  return (
    <footer className="border-t border-line py-12">
      <Container>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Wordmark />
            <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
              A hackathon build for OKX Dev Day 2026. Test tokens only, no custody, no fiat
              leg, and no claim that anyone is eligible to receive tokenized equity.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2.5 text-[13px]">
            <Link
              href="/app"
              className="text-ink-muted transition-colors duration-200 ease-standard hover:text-ink"
            >
              Open the app
            </Link>
            <a
              href="#how"
              className="text-ink-muted transition-colors duration-200 ease-standard hover:text-ink"
            >
              How it works
            </a>
            <a
              href="#honesty"
              className="text-ink-muted transition-colors duration-200 ease-standard hover:text-ink"
            >
              Limitations
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
