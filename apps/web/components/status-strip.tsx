"use client";

import { WalletPill } from "./wallet-pill";
import { X_LAYER_TESTNET } from "@/lib/config";

export function StatusStrip() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-gold text-[11px] font-bold text-on-gold">
          S
        </span>
        <div className="leading-none">
          <div className="text-[13px] font-semibold tracking-[-0.01em] text-ink">StockBack</div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-subtle">
            <span
              className="size-1.5 animate-pulse-dot rounded-full bg-chain text-chain"
              aria-hidden="true"
            />
            {X_LAYER_TESTNET.name}
          </div>
        </div>
      </div>
      <WalletPill />
    </div>
  );
}
