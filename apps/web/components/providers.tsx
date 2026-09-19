"use client";

import type { ReactNode } from "react";
import { WalletProvider } from "@/lib/wallet";
import { AppStateProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </WalletProvider>
  );
}
