"use client";

import { Check, CircleDashed, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { useAppDispatch, useAppState, type TxStatus } from "@/lib/store";
import { cn } from "@/lib/cn";

const STEPS: Array<{ id: TxStatus; label: string; detail: string }> = [
  { id: "approving", label: "Approve token", detail: "Allow the router to move your payment asset." },
  { id: "awaiting-signature", label: "Sign payment", detail: "Confirm the transaction in your wallet." },
  { id: "pending", label: "Settle on X Layer", detail: "Waiting for the block to include it." },
];

const ORDER: TxStatus[] = ["approving", "awaiting-signature", "pending", "confirmed"];

export function AuthorizeScreen() {
  const { txStatus, txError } = useAppState();
  const dispatch = useAppDispatch();
  const currentIndex = ORDER.indexOf(txStatus);
  const failed = txStatus === "rejected" || txStatus === "failed";

  return (
    <div className="flex min-h-full flex-col justify-center px-6 pb-10">
      {failed ? (
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-bad/12 text-bad">
            <XCircle size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[19px] font-semibold text-ink">
            {txStatus === "rejected" ? "You rejected the request" : "Payment did not go through"}
          </h1>
          <p className="mx-auto mt-2 max-w-[18rem] text-[13px] leading-relaxed text-ink-muted">
            {txError ?? "Nothing was charged. You can review the payment and try again."}
          </p>
          <div className="mt-6 space-y-2">
            <Button block size="lg" onClick={() => dispatch({ type: "goto-review" })}>
              Back to review
            </Button>
            <Button block variant="ghost" onClick={() => dispatch({ type: "reset-flow" })}>
              Start over
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center">
            <Spinner size={30} className="mx-auto text-gold" />
            <h1 className="mt-4 text-[19px] font-semibold text-ink">Settling payment</h1>
            <p className="mt-1.5 text-[13px] text-ink-muted">Keep this screen open.</p>
          </div>

          <ol className="mt-8 space-y-1">
            {STEPS.map((step) => {
              const stepIndex = ORDER.indexOf(step.id);
              const done = currentIndex > stepIndex;
              const active = currentIndex === stepIndex;

              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 rounded-card px-3 py-3 transition-colors duration-200 ease-standard",
                    active && "bg-raised",
                  )}
                >
                  <span className="mt-px shrink-0">
                    {done ? (
                      <Check size={17} className="text-good" aria-hidden="true" />
                    ) : active ? (
                      <Spinner size={17} className="text-gold" />
                    ) : (
                      <CircleDashed size={17} className="text-ink-subtle" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[14px] font-medium",
                        done || active ? "text-ink" : "text-ink-subtle",
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                      {step.detail}
                    </span>
                  </span>
                  <span className="sr-only">
                    {done ? "completed" : active ? "in progress" : "pending"}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
