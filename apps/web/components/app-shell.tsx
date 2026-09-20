"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { StatusStrip } from "./status-strip";
import { TabBar } from "./tab-bar";
import { PhoneFrame } from "./ui/phone-frame";
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
      {/* Mobile: the app owns the whole viewport. This is the real product. */}
      <div className="h-dvh lg:hidden">
        <AppSurface />
      </div>

      {/* Desktop: the same build inside a presentation frame. The pitch lives on "/". */}
      <div className="hidden min-h-dvh lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-8 lg:py-12">
        <PhoneFrame>
          <AppSurface />
        </PhoneFrame>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-control px-3 py-2 text-[13px] text-ink-muted transition-colors duration-200 ease-standard hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to the overview
        </Link>
      </div>
    </div>
  );
}
