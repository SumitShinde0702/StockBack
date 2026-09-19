"use client";

import { useCallback, useState } from "react";
import { DEMO_FIXTURES, parseSgqr } from "@stockback/sgqr";
import { ChevronRight, ScanLine, Sparkles } from "lucide-react";
import { QrScanner } from "../qr-scanner";
import { Button } from "../ui/button";
import { Callout } from "../ui/callout";
import { Field } from "../ui/field";
import { StepHeader } from "../ui/step-header";
import { useAppDispatch, useAppState } from "@/lib/store";
import { lookupMerchant } from "@/lib/config";

export function ScanScreen() {
  const { scanStatus, scanError } = useAppState();
  const dispatch = useAppDispatch();
  const [cameraOn, setCameraOn] = useState(false);
  const [pasted, setPasted] = useState("");

  const handlePayload = useCallback(
    (payload: string) => {
      dispatch({ type: "scan-start" });
      const result = parseSgqr(payload);

      if (!result.ok) {
        setCameraOn(false);
        dispatch({ type: "scan-failed", error: result.error });
        return;
      }

      setCameraOn(false);
      dispatch({
        type: "scan-succeeded",
        invoice: {
          payload: result.value,
          merchant: lookupMerchant(result.value.payNow?.proxyValue),
          fiatMinorUnits: result.value.amountMinor,
          amountEnteredByPayer: false,
        },
      });
    },
    [dispatch],
  );

  return (
    <div className="pb-6">
      <StepHeader
        title="Scan to pay"
        subtitle="Point at any SGQR merchant code, or use a demo code below."
      />

      <div className="px-4">
        <button
          onClick={() => setCameraOn((on) => !on)}
          aria-label={cameraOn ? "Stop camera" : "Start camera"}
          className="relative block aspect-square w-full overflow-hidden rounded-sheet border border-line bg-surface"
        >
          <QrScanner active={cameraOn} onDetected={handlePayload} />

          {/* Framing guides and the sweep line sit above the video feed. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className="absolute inset-6 rounded-2xl shadow-[0_0_0_9999px_rgba(8,11,18,0.55)]" />
            {(
              [
                "left-6 top-6 border-l-2 border-t-2 rounded-tl-xl",
                "right-6 top-6 border-r-2 border-t-2 rounded-tr-xl",
                "left-6 bottom-6 border-b-2 border-l-2 rounded-bl-xl",
                "right-6 bottom-6 border-b-2 border-r-2 rounded-br-xl",
              ] as const
            ).map((position) => (
              <span key={position} className={`absolute size-9 border-gold/90 ${position}`} />
            ))}
            {cameraOn ? (
              <span className="absolute inset-x-8 top-8 h-px animate-scanline bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_12px_2px] shadow-gold/40" />
            ) : null}
          </span>
        </button>

        {scanStatus === "error" && scanError ? (
          <Callout tone="bad" title="Could not read that code" className="mt-4">
            {scanError.message}
          </Callout>
        ) : null}

        <div className="mt-5">
          <Field
            label="Or paste an SGQR payload"
            placeholder="00020101021226…"
            mono
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            hint="The payload is decoded on this device. Nothing is uploaded."
          />
          <Button
            block
            variant="secondary"
            className="mt-2.5"
            disabled={pasted.trim().length === 0}
            onClick={() => handlePayload(pasted)}
            icon={<ScanLine size={16} aria-hidden="true" />}
          >
            Decode payload
          </Button>
        </div>

        <section className="mt-7">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
            <Sparkles size={12} aria-hidden="true" />
            Demo codes
          </h2>
          <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">
            Generated payloads with fictional UENs. No real merchant data is in this repo.
          </p>
          <ul className="mt-3 space-y-2">
            {DEMO_FIXTURES.map((fixture) => (
              <li key={fixture.id}>
                <button
                  onClick={() => handlePayload(fixture.payload)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-2.5 text-left transition-colors duration-200 ease-standard hover:border-line-strong hover:bg-raised"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {fixture.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-muted">{fixture.blurb}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
