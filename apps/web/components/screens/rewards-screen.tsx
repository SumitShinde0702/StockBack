"use client";

import { Coins, Inbox } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardHeader } from "../ui/card";
import { StatRow } from "../ui/stat-row";
import { StepHeader } from "../ui/step-header";
import { Callout } from "../ui/callout";
import { Spinner } from "../ui/spinner";
import { CONTRACTS_CONFIGURED, MIN_WITHDRAWAL_UNITS, REWARD_ASSETS } from "@/lib/config";
import { formatUnits, parseUnits } from "@/lib/format";
import { useAppDispatch, useAppState } from "@/lib/store";
import { useRewards } from "@/lib/use-rewards";
import { lookupXStock } from "@/lib/xstocks";

export function RewardsScreen() {
  const { ledger } = useAppState();
  const dispatch = useAppDispatch();
  const rewards = useRewards();

  // Onchain balance wins when a router is deployed and the wallet is connected; otherwise
  // the screen shows the local preview mirror and labels it.
  const holdings = REWARD_ASSETS.map((asset) => ({
    asset,
    units:
      rewards.live && rewards.chain
        ? asset.symbol === REWARD_ASSETS[0].symbol
          ? rewards.chain.credited
          : 0n
        : BigInt(ledger[asset.symbol] ?? "0"),
  })).filter((h) => h.units > 0n);

  const threshold = parseUnits(String(MIN_WITHDRAWAL_UNITS), REWARD_ASSETS[0].decimals);

  return (
    <div className="pb-6">
      <StepHeader
        title="Reward ledger"
        subtitle="Fractional xStock earned from the 1% cashback budget."
      />

      <div className="space-y-3.5 px-4">
        {holdings.length === 0 ? (
          <EmptyState onScan={() => dispatch({ type: "set-tab", tab: "pay" })} />
        ) : (
          <>
            {holdings.map(({ asset, units }) => {
              const display = formatUnits(units, asset.decimals, 6);
              const meetsThreshold = units >= threshold;
              const backed = rewards.chain ? rewards.chain.backing >= units : false;
              const claimable = rewards.live && meetsThreshold && backed;
              const reference = lookupXStock(asset.symbol);

              return (
                <Card key={asset.symbol}>
                  <div className="flex items-start justify-between gap-3 px-4 pt-4">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink">{asset.symbol}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-muted">{asset.name}</p>
                    </div>
                    <p className="tnum shrink-0 font-mono text-[20px] font-semibold text-gold">
                      {display}
                    </p>
                  </div>
                  <div className="px-4 pb-3 pt-2">
                    <StatRow
                      label="Withdrawal threshold"
                      value={`${MIN_WITHDRAWAL_UNITS} ${asset.symbol}`}
                      tone="muted"
                    />
                    {rewards.live && rewards.chain ? (
                      <StatRow
                        label="Covered by router balance"
                        value={backed ? "Fully backed" : "Awaiting backing"}
                        tone={backed ? "good" : "warn"}
                      />
                    ) : null}
                    <StatRow
                      label="Token in this deployment"
                      value={reference?.officialAddress ? "Official xStock" : "Labelled mock"}
                      hint={
                        reference?.officialAddress
                          ? `${reference.issuer}, tracking ${reference.underlying}`
                          : `Test token only. ${reference?.name ?? asset.name} is issued by ${reference?.issuer ?? "Backed Finance AG"}; this build does not distribute it.`
                      }
                      tone={reference?.officialAddress ? "good" : "warn"}
                    />
                    <Button
                      block
                      variant="secondary"
                      className="mt-2"
                      disabled={!claimable || rewards.claimStatus === "pending"}
                      onClick={() => void rewards.claim(asset.symbol, units)}
                    >
                      {rewards.claimStatus === "pending" ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner size={15} />
                          Withdrawing
                        </span>
                      ) : !CONTRACTS_CONFIGURED ? (
                        "No router deployed"
                      ) : !rewards.connected ? (
                        "Connect wallet to withdraw"
                      ) : !meetsThreshold ? (
                        "Below threshold"
                      ) : !backed ? (
                        "Not yet backed"
                      ) : (
                        "Withdraw to wallet"
                      )}
                    </Button>
                    {rewards.claimError ? (
                      <p className="mt-2 text-[12px] leading-snug text-bad">{rewards.claimError}</p>
                    ) : null}
                  </div>
                </Card>
              );
            })}

            <Card>
              <CardHeader
                title="Treasury backing"
                icon={<Coins size={13} aria-hidden="true" />}
                action={
                  <Badge tone={rewards.live ? "chain" : "warn"}>
                    {rewards.live ? "Onchain" : CONTRACTS_CONFIGURED ? "Wallet not connected" : "Not deployed"}
                  </Badge>
                }
              />
              {rewards.chain ? (
                <div className="px-4 pb-1">
                  <StatRow
                    label="Reward tokens held by router"
                    value={`${formatUnits(rewards.chain.backing, REWARD_ASSETS[0].decimals, 6)} ${REWARD_ASSETS[0].symbol}`}
                  />
                  <StatRow
                    label="Credited but unbacked"
                    value={`${formatUnits(rewards.chain.unbacked, REWARD_ASSETS[0].decimals, 6)} ${REWARD_ASSETS[0].symbol}`}
                    tone={rewards.chain.unbacked > 0n ? "warn" : "good"}
                  />
                </div>
              ) : null}
              <p className="px-4 pb-4 pt-2 text-[12.5px] leading-relaxed text-ink-muted">
                Ledger balances are claims against xStock held by the router. The contract
                refuses a withdrawal that its balance cannot cover, so the ledger can never
                promise more than the buffer holds.
              </p>
            </Card>
          </>
        )}

        <Callout tone="info" title="How the buffer is refilled">
          Spread income accumulates in the router as stablecoin. Topping the buffer back up
          is an operator action performed outside this app; it is not an automated
          exchange order, and nothing here places a trade on your behalf.
        </Callout>
      </div>
    </div>
  );
}

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-raised text-ink-subtle">
        <Inbox size={24} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-[16px] font-semibold text-ink">No cashback yet</h2>
      <p className="mt-1.5 max-w-[17rem] text-[13px] leading-relaxed text-ink-muted">
        Pay a registered merchant and 1% of the invoice comes back as fractional tokenized
        stock.
      </p>
      <Button className="mt-5" onClick={onScan}>
        Scan a code
      </Button>
    </div>
  );
}
