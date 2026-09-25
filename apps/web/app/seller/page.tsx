import Link from "next/link";
import { ArrowLeft, Smartphone } from "lucide-react";
import { Wordmark } from "@/components/landing/wordmark";
import { getSellerCodes } from "@/lib/seller-codes";

export const metadata = {
  title: "Seller counter — StockBack",
  description: "Demo SGQR stickers to scan with the StockBack payer app.",
};

export const dynamic = "force-dynamic";

/**
 * Merchant-side surface for the demo: open this on a laptop, open `/app` on a phone,
 * scan the sticker. Encodes real SGQR payloads, not a deep link into the web app.
 */
export default async function SellerPage() {
  const codes = await getSellerCodes();
  const featured = codes.find((code) => code.id === "kopitiam") ?? codes[0];
  const others = codes.filter((code) => code.id !== featured.id);

  return (
    <div className="min-h-dvh bg-canvas canvas-glow">
      <header className="border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-control text-[13px] text-ink-muted transition-colors duration-200 ease-standard hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <Wordmark />
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-raised px-4 text-[13.5px] font-semibold text-ink transition-colors duration-200 ease-standard hover:border-line-strong hover:bg-overlay"
          >
            <Smartphone size={14} aria-hidden="true" />
            Open payer app
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-gold">
            Seller counter
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2.75rem]">
            Put this on the laptop. Scan it from the phone.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted sm:text-[16px]">
            Each sticker encodes a real EMVCo SGQR payload — the same format a Singapore
            merchant would display. Open{" "}
            <Link href="/app" className="text-ink underline-offset-2 hover:underline">
              /app
            </Link>{" "}
            on your phone, start the camera, and scan.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <Sticker code={featured} featured />

          <aside className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-[14px] font-semibold text-ink">Demo script</h2>
            <ol className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink-muted">
              <li>
                <span className="font-medium text-ink">1.</span> Keep this page on your laptop
                (or a second tab).
              </li>
              <li>
                <span className="font-medium text-ink">2.</span> On your phone, open the payer
                app and tap the camera.
              </li>
              <li>
                <span className="font-medium text-ink">3.</span> Scan{" "}
                <span className="text-ink">{featured.title}</span> for a full quote → pay flow.
              </li>
              <li>
                <span className="font-medium text-ink">4.</span> Use the hawker code to demo
                amount entry, or the unregistered code to show a hard stop.
              </li>
            </ol>
            <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-subtle">
              Phone and laptop must be on the same Wi-Fi if you are using a LAN URL. On this
              machine you can also open{" "}
              <code className="font-mono text-[11.5px] text-ink-muted">localhost:3100/app</code>.
            </p>
          </aside>
        </div>

        <section className="mt-14">
          <h2 className="text-[15px] font-semibold text-ink">More stickers</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-muted">
            Same scanner, different paths — registered, amount-entry, and unsupported merchant.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((code) => (
              <Sticker key={code.id} code={code} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Sticker({
  code,
  featured = false,
}: {
  code: Awaited<ReturnType<typeof getSellerCodes>>[number];
  featured?: boolean;
}) {
  return (
    <article
      className={
        featured
          ? "rounded-sheet border border-line-strong bg-surface p-6 sm:p-8"
          : "rounded-card border border-line bg-surface p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
            SGQR · Singapore
          </p>
          <h3
            className={
              featured
                ? "mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink"
                : "mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-ink"
            }
          >
            {code.title}
          </h3>
          {code.category ? (
            <p className="mt-1 text-[12.5px] text-ink-muted">{code.category}</p>
          ) : null}
        </div>
        <span
          className={
            code.registered
              ? "shrink-0 rounded-full border border-good-dim bg-good/10 px-2.5 py-1 text-[10.5px] font-medium text-good"
              : "shrink-0 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-[10.5px] font-medium text-warn"
          }
        >
          {code.registered ? "Registered" : "No X Layer address"}
        </span>
      </div>

      <div
        className={
          featured
            ? "mx-auto mt-6 size-[240px] rounded-card bg-white p-3 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)] sm:size-[280px] [&>svg]:size-full"
            : "mx-auto mt-5 size-[180px] rounded-card bg-white p-2.5 [&>svg]:size-full"
        }
        dangerouslySetInnerHTML={{ __html: code.qrSvg }}
        role="img"
        aria-label={`SGQR code for ${code.title}`}
      />

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-subtle">Amount</p>
          <p
            className={
              featured
                ? "tnum mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink"
                : "tnum mt-0.5 text-[20px] font-semibold tracking-[-0.02em] text-ink"
            }
          >
            {code.amountLabel}
          </p>
        </div>
        <p className="max-w-[12rem] text-right text-[11.5px] leading-snug text-ink-muted">
          {code.blurb}
        </p>
      </div>
    </article>
  );
}
