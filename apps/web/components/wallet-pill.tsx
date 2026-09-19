"use client";

import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/cn";

export function WalletPill() {
  const { status, address, wrongNetwork, connect, disconnect, switchToXLayer } = useWallet();

  if (wrongNetwork) {
    return (
      <button
        onClick={() => void switchToXLayer()}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-bad/35 bg-bad/12 px-3 text-[12px] font-semibold text-bad transition-colors duration-200 ease-standard hover:bg-bad/20"
      >
        Switch to X Layer
      </button>
    );
  }

  if (status === "connected" && address) {
    return (
      <button
        onClick={disconnect}
        title="Disconnect"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-raised px-3 font-mono text-[12px] text-ink-muted transition-colors duration-200 ease-standard hover:border-line-strong hover:text-ink"
      >
        <span className="size-1.5 rounded-full bg-good" aria-hidden="true" />
        {shortAddress(address, 5, 4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => void connect()}
      disabled={status === "connecting"}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-gold/35 bg-gold/12 px-3",
        "text-[12px] font-semibold text-gold",
        "transition-colors duration-200 ease-standard hover:bg-gold/20 disabled:opacity-60",
      )}
    >
      <Wallet size={13} aria-hidden="true" />
      {status === "connecting" ? "Connecting…" : "Connect"}
    </button>
  );
}
