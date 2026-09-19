"use client";

import { AnimatePresence, motion } from "motion/react";
import { StatusStrip } from "./status-strip";
import { TabBar } from "./tab-bar";
import { PhoneFrame } from "./ui/phone-frame";
import { ContextPanel } from "./context-panel";
import { ScanScreen } from "./screens/scan-screen";
import { AmountScreen } from "./screens/amount-screen";
import { ReviewScreen } from "./screens/review-screen";
import { AuthorizeScreen } from "./screens/authorize-screen";
import { ReceiptScreen } from "./screens/receipt-screen";
import { RewardsScreen } from "./screens/rewards-screen";
import { SettingsScreen } from "./screens/settings-screen";
import { useAppState } from "@/lib/store";

function ActiveScreen() {
  const { tab, screen } = useAppState();

  if (tab === "rewards") return <RewardsScreen />;
  if (tab === "settings") return <SettingsScreen />;

  switch (screen) {
    case "amount":
      return <AmountScreen />;
    case "review":
      return <ReviewScreen />;
    case "authorize":
      return <AuthorizeScreen />;
    case "receipt":
      return <ReceiptScreen />;
    default:
      return <ScanScreen />;
  }
}

function AppSurface() {
  const { tab, screen } = useAppState();
  const key = tab === "pay" ? `pay:${screen}` : tab;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-canvas canvas-glow">
      <StatusStrip />
      <main className="relative min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.13, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
            className="min-h-full"
          >
            <ActiveScreen />
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar />
    </div>
  );
}

export function AppShell() {
  return (
    <div className="min-h-dvh">
      {/* Mobile: the app is the whole viewport. This is the real product. */}
      <div className="h-dvh lg:hidden">
        <AppSurface />
      </div>

      {/* Desktop: the same app inside a presentation frame, beside judge-facing context. */}
      <div className="hidden min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:px-12 xl:gap-24 xl:px-20">
        <ContextPanel />
        <div className="py-12">
          <PhoneFrame>
            <AppSurface />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}
