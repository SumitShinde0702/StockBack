"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "../ui/card";
import { Callout } from "../ui/callout";
import { Field } from "../ui/field";
import { Button } from "../ui/button";
import { SegmentedControl } from "../ui/segmented-control";
import { StepHeader } from "../ui/step-header";
import { Toggle } from "../ui/toggle";
import { CopyableHash } from "../ui/copyable-hash";
import {
  CONTRACTS,
  CONTRACTS_CONFIGURED,
  PAY_ASSETS,
  REWARD_ASSETS,
  X_LAYER_TESTNET,
} from "@/lib/config";
import { useAppDispatch, useAppState } from "@/lib/store";

const TOLERANCES = [
  { value: "0", label: "Any loss" },
  { value: "200", label: "2%" },
  { value: "500", label: "5%" },
  { value: "1000", label: "10%" },
];

function basisFromSettings(costBasis: Record<string, number>) {
  return Object.fromEntries(
    PAY_ASSETS.map((a) => [a.symbol, costBasis[a.symbol]?.toString() ?? ""]),
  );
}

export function SettingsScreen() {
  const { settings } = useAppState();
  const dispatch = useAppDispatch();
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    basisFromSettings(settings.costBasis),
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = useMemo(() => {
    return PAY_ASSETS.some((asset) => {
      const draft = (drafts[asset.symbol] ?? "").trim();
      const saved = settings.costBasis[asset.symbol];
      if (draft === "" && (saved === undefined || saved === null)) return false;
      if (draft === "" && saved !== undefined) return true;
      const parsed = Number(draft);
      if (!Number.isFinite(parsed)) return true;
      return saved !== parsed;
    });
  }, [drafts, settings.costBasis]);

  function commitAll() {
    const next: Record<string, number> = { ...settings.costBasis };
    for (const asset of PAY_ASSETS) {
      const raw = (drafts[asset.symbol] ?? "").trim();
      const parsed = Number(raw);
      if (raw === "" || !Number.isFinite(parsed) || parsed <= 0) {
        delete next[asset.symbol];
        setDrafts((d) => ({ ...d, [asset.symbol]: "" }));
      } else {
        next[asset.symbol] = parsed;
        setDrafts((d) => ({ ...d, [asset.symbol]: String(parsed) }));
      }
    }
    dispatch({ type: "update-settings", patch: { costBasis: next } });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  return (
    <div className="pb-6">
      <StepHeader title="Settings" subtitle="Spend Guard policy and network details." />

      <div className="space-y-3.5 px-4">
        <Card>
          <CardHeader title="Spend Guard" />
          <div className="px-4 pb-4">
            <Toggle
              checked={settings.guardEnabled}
              onChange={(guardEnabled) => dispatch({ type: "update-settings", patch: { guardEnabled } })}
              label="Block loss-spending"
              description="Stop a payment when the asset you are spending is below the cost basis you recorded."
            />

            {settings.guardEnabled ? (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-medium text-ink-muted">
                  Allowed drawdown before blocking
                </p>
                <SegmentedControl
                  label="Loss tolerance"
                  value={String(settings.lossToleranceBps)}
                  onChange={(value) =>
                    dispatch({
                      type: "update-settings",
                      patch: { lossToleranceBps: Number(value) },
                    })
                  }
                  options={TOLERANCES}
                />
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Your cost basis" />
          <div className="space-y-3.5 px-4 pb-4">
            <p className="text-[12.5px] leading-snug text-ink-muted">
              What you paid per unit, in USD. This is your own record: the app cannot read
              your acquisition history, and the contract does not verify these numbers.
            </p>
            {PAY_ASSETS.map((asset) => (
              <Field
                key={asset.symbol}
                label={`${asset.symbol} cost basis`}
                inputMode="decimal"
                placeholder="0.00"
                suffix="USD"
                value={drafts[asset.symbol] ?? ""}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^\d.]/g, "");
                  setDrafts((d) => ({ ...d, [asset.symbol]: value }));
                  setSavedFlash(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitAll();
                    (event.target as HTMLInputElement).blur();
                  }
                }}
              />
            ))}
            <Button block disabled={!dirty} onClick={commitAll}>
              {savedFlash ? "Saved" : "Save cost basis"}
            </Button>
            <p className="text-[11.5px] leading-snug text-ink-subtle">
              Stored only in this browser. Toggle and tolerance save immediately; cost basis
              needs Save.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Cashback asset" />
          <div className="px-4 pb-4">
            <SegmentedControl
              label="Reward asset"
              value={settings.rewardAssetSymbol}
              onChange={(rewardAssetSymbol) =>
                dispatch({ type: "update-settings", patch: { rewardAssetSymbol } })
              }
              options={REWARD_ASSETS.map((asset) => ({
                value: asset.symbol,
                label: asset.symbol,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Network" />
          <div className="space-y-2 px-4 pb-4">
            <Row label="Chain" value={`${X_LAYER_TESTNET.name} · ${X_LAYER_TESTNET.id}`} />
            {CONTRACTS_CONFIGURED ? (
              <>
                <RowNode label="Router">
                  <CopyableHash value={CONTRACTS.router} />
                </RowNode>
                <RowNode label="Pay token">
                  <CopyableHash value={CONTRACTS.payToken} />
                </RowNode>
                <RowNode label="Reward token">
                  <CopyableHash value={CONTRACTS.rewardToken} />
                </RowNode>
              </>
            ) : (
              <p className="text-[12.5px] leading-snug text-ink-muted">
                No contracts configured. The app prices payments and previews receipts, but
                will not claim to have settled anything.
              </p>
            )}
          </div>
        </Card>

        <Callout tone="info" title="What this build does not do">
          It does not move fiat through PayNow, hold your funds, place orders on an
          exchange, or deposit into a yield product. Those are documented as future work,
          not demonstrated here.
        </Callout>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className="tnum text-[13px] text-ink">{value}</span>
    </div>
  );
}

function RowNode({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
