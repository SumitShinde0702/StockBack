"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Callout } from "../ui/callout";
import { StepHeader } from "../ui/step-header";
import { useAppDispatch, useAppState } from "@/lib/store";

const QUICK_AMOUNTS = ["3.50", "6.00", "12.00", "18.50"];

/** Static SGQR codes carry no amount, so the payer supplies one. */
export function AmountScreen() {
  const { invoice } = useAppState();
  const dispatch = useAppDispatch();
  const [value, setValue] = useState("");

  const valid = /^\d{1,6}(\.\d{1,2})?$/.test(value) && Number(value) > 0;

  function submit(next: string) {
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(next) || Number(next) <= 0) return;
    const [whole, fraction = ""] = next.split(".");
    const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
    dispatch({ type: "set-amount", fiatMinorUnits: cents });
    dispatch({ type: "goto-review" });
  }

  return (
    <div className="flex min-h-full flex-col pb-6">
      <StepHeader
        title="Enter the amount"
        subtitle={invoice?.payload.merchantName ?? "Static code"}
        onBack={() => dispatch({ type: "back" })}
      />

      <div className="flex-1 px-4">
        <Callout tone="info" title="This code is static">
          It carries no amount, so the merchant expects you to key in what you owe. The
          decoded UEN and merchant name are still used to route the payment.
        </Callout>

        <div className="mt-8 flex items-baseline justify-center gap-2">
          <span className="text-[22px] font-medium text-ink-muted">S$</span>
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(event) => {
              const next = event.target.value.replace(/[^\d.]/g, "");
              if (/^\d{0,6}(\.\d{0,2})?$/.test(next)) setValue(next);
            }}
            placeholder="0.00"
            aria-label="Amount in Singapore dollars"
            className="tnum w-[7ch] bg-transparent text-center text-[48px] font-semibold leading-none tracking-[-0.03em] text-ink outline-none placeholder:text-ink-subtle"
          />
        </div>

        <div className="mt-8 grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setValue(amount)}
              className="tnum min-h-11 rounded-control border border-line bg-surface text-[13px] font-medium text-ink-muted transition-colors duration-200 ease-standard hover:border-line-strong hover:text-ink"
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-6">
        <Button block size="lg" disabled={!valid} onClick={() => submit(value)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
