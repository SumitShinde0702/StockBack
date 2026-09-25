import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal } from "./reveal";
import { X_LAYER_TESTNET, explorerAddress, explorerTx } from "@/lib/config";
import { DEPLOYMENT } from "@/lib/deployment";

const CONTRACT_ROWS = [
  {
    address: DEPLOYMENT.router,
    name: "StockBackRouter",
    role: "Settles the invoice, splits the 2% spread, credits cashback",
    kind: "router",
  },
  {
    address: DEPLOYMENT.payToken,
    name: "DemoUSD",
    role: "Six-decimal test payment token. Not a real stablecoin",
    kind: "ERC-20",
  },
  {
    address: DEPLOYMENT.rewardToken,
    name: "MockXNVDA",
    role: "Labelled mock reward token. Not an issued xStock",
    kind: "ERC-20",
  },
] as const;

export function Deployment() {
  return (
    <Section id="deployment" className="border-y border-line bg-surface/40">
      <SectionHeading
        eyebrow="On chain"
        title="Live on X Layer testnet."
        lede="These are real deployed addresses a judge can open in the explorer. Settlement, fee split and the reward ledger all run through the router."
      />

      <Reveal>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-chain-dim bg-chain/10 px-3 py-1.5 text-[12px] font-medium text-chain">
            <span className="size-1.5 rounded-full bg-chain" aria-hidden="true" />
            {X_LAYER_TESTNET.name}
          </span>
          <span className="rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-[12px] text-ink-muted">
            chain {DEPLOYMENT.chainId}
          </span>
          <a
            href={X_LAYER_TESTNET.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors duration-200 ease-standard hover:border-line-strong hover:text-ink"
          >
            Open explorer
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </Reveal>

      <div className="mt-8 overflow-hidden rounded-card border border-line bg-line">
        {CONTRACT_ROWS.map((row, index) => (
          <Reveal key={row.address} delay={index * 0.06}>
            <article className="flex flex-col gap-3 border-b border-line bg-canvas p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[15px] font-semibold text-ink">{row.name}</h3>
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
                    {row.kind}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{row.role}</p>
              </div>
              <a
                href={explorerAddress(row.address)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-control border border-line bg-raised px-3.5 py-2.5 font-mono text-[12.5px] text-chain transition-colors duration-200 ease-standard hover:border-line-strong hover:text-ink sm:self-center"
              >
                <span className="max-w-[16rem] truncate sm:max-w-none">{row.address}</span>
                <ArrowUpRight size={14} className="shrink-0" aria-hidden="true" />
              </a>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.08}>
        <article className="mt-5 rounded-card border border-line bg-canvas p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Sample settlement
              </p>
              <h3 className="mt-1.5 text-[15px] font-semibold text-ink">
                {DEPLOYMENT.sampleSettlement.fiat} to {DEPLOYMENT.sampleSettlement.merchant}
              </h3>
              <p className="mt-1 text-[13px] text-ink-muted">
                Block {DEPLOYMENT.sampleSettlement.blockNumber.toLocaleString("en-US")} · X Layer
                testnet
              </p>
            </div>
            <a
              href={explorerTx(DEPLOYMENT.sampleSettlement.txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-control border border-line bg-raised px-3.5 py-2.5 font-mono text-[12.5px] text-chain transition-colors duration-200 ease-standard hover:border-line-strong hover:text-ink"
            >
              <span className="max-w-[16rem] truncate sm:max-w-none">
                {DEPLOYMENT.sampleSettlement.txHash}
              </span>
              <ArrowUpRight size={14} className="shrink-0" aria-hidden="true" />
            </a>
          </div>
        </article>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-5 text-[12.5px] leading-relaxed text-ink-subtle">
          Deployed {new Date(DEPLOYMENT.deployedAt).toUTCString()}. Source of truth:{" "}
          <code className="font-mono text-[11.5px] text-ink-muted">
            packages/contracts/deployments/xlayer-testnet.json
          </code>
          .
        </p>
      </Reveal>
    </Section>
  );
}
