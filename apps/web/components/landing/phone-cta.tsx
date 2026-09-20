import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight, ArrowUpRight, Smartphone } from "lucide-react";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { getPhoneAccess } from "@/lib/phone-url";
import { CONTRACTS, CONTRACTS_CONFIGURED, X_LAYER_TESTNET, explorerAddress } from "@/lib/config";
import { shortAddress } from "@/lib/format";

const DEPLOYED = [
  { label: "Router", key: "router" },
  { label: "Payment token", key: "payToken" },
  { label: "Reward token", key: "rewardToken" },
] as const;

export async function PhoneCta() {
  const access = await getPhoneAccess("/app");
  const target = access.urls[0] ?? access.localUrl;

  // QR modules stay dark on white: a phone camera should not have to fight a dark theme.
  const qr = await QRCode.toString(target, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0e1320ff", light: "#ffffffff" },
  });

  return (
    <Section id="demo">
      <div className="overflow-hidden rounded-sheet border border-line bg-surface">
        <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:p-14">
          <Reveal>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5 text-[11.5px] font-medium text-ink-muted">
                <Smartphone size={13} aria-hidden="true" />
                Built mobile-first
              </span>

              <h2 className="mt-6 text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[2.5rem]">
                Try it on the device it was designed for.
              </h2>

              <p className="mt-5 text-[15.5px] leading-relaxed text-ink-muted">
                Scan this with a phone on the same network and the app opens full screen — no
                frame, no desktop chrome, exactly what a payer would see at the counter.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/app"
                  className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-card bg-gold px-6 text-[16px] font-semibold text-on-gold transition-[background-color,transform] duration-200 ease-standard hover:bg-gold/90 active:scale-[0.985]"
                >
                  Open it here instead
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>

              <dl className="mt-9 space-y-2.5 border-t border-line pt-6">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[12.5px] text-ink-muted">Network</dt>
                  <dd className="text-[12.5px] font-medium text-ink">
                    {X_LAYER_TESTNET.name} · chain {X_LAYER_TESTNET.id}
                  </dd>
                </div>
                {CONTRACTS_CONFIGURED ? (
                  DEPLOYED.map((item) => (
                    <div key={item.key} className="flex items-baseline justify-between gap-4">
                      <dt className="text-[12.5px] text-ink-muted">{item.label}</dt>
                      <dd>
                        <a
                          href={explorerAddress(CONTRACTS[item.key])}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[12.5px] text-chain transition-colors duration-200 ease-standard hover:text-ink"
                        >
                          {shortAddress(CONTRACTS[item.key], 8, 6)}
                          <ArrowUpRight size={12} aria-hidden="true" />
                        </a>
                      </dd>
                    </div>
                  ))
                ) : (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[12.5px] text-ink-muted">Contracts</dt>
                    <dd className="text-[12.5px] text-warn">Not configured in this environment</dd>
                  </div>
                )}
              </dl>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto lg:mx-0">
            <div className="flex flex-col items-center">
              <div
                className="size-[200px] rounded-card bg-white p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] sm:size-[228px] [&>svg]:size-full"
                // Generated from our own URL string by the qrcode package.
                dangerouslySetInnerHTML={{ __html: qr }}
                role="img"
                aria-label={`QR code linking to ${target}`}
              />
              <p className="mt-4 max-w-[228px] break-all text-center font-mono text-[11.5px] leading-relaxed text-ink-subtle">
                {target}
              </p>
              {access.urls.length > 1 ? (
                <p className="mt-2 max-w-[240px] text-center text-[11px] leading-relaxed text-ink-subtle">
                  If that address does not resolve, try{" "}
                  {access.urls
                    .slice(1, 3)
                    .map((url) => url.replace(/^http:\/\//, ""))
                    .join(" or ")}
                  .
                </p>
              ) : null}
              {access.urls.length === 0 ? (
                <p className="mt-2 max-w-[240px] text-center text-[11px] leading-relaxed text-warn">
                  No LAN address detected, so this code only works on this machine.
                </p>
              ) : null}
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
