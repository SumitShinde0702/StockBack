"use client";

import { QrCode, Settings2, Wallet2 } from "lucide-react";
import { useAppDispatch, useAppState, type Tab } from "@/lib/store";
import { cn } from "@/lib/cn";

const TABS: Array<{ id: Tab; label: string; Icon: typeof QrCode }> = [
  { id: "pay", label: "Pay", Icon: QrCode },
  { id: "rewards", label: "Rewards", Icon: Wallet2 },
  { id: "settings", label: "Settings", Icon: Settings2 },
];

export function TabBar() {
  const { tab } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <nav
      aria-label="Primary"
      className="shrink-0 border-t border-line bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur"
    >
      <ul className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <li key={id} className="flex-1">
              <button
                onClick={() => dispatch({ type: "set-tab", tab: id })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-control py-1",
                  "transition-colors duration-200 ease-standard",
                  active ? "text-gold" : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                <Icon size={19} aria-hidden="true" strokeWidth={active ? 2.3 : 1.8} />
                <span className="text-[10.5px] font-medium leading-none">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
