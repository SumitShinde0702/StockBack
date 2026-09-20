import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "StockBack",
  description: "Scan an SGQR code, settle on X Layer, earn 1% back in tokenized stock.",
};

export default function AppPage() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  );
}
