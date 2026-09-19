"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export function truncateMiddle(value: string, head = 6, tail = 4) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function CopyableHash({
  value,
  display,
  className,
  ariaLabel,
}: {
  value: string;
  display?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard is unavailable over plain http on some devices; fail quietly.
    }
  }, [value]);

  return (
    <button
      onClick={copy}
      aria-label={ariaLabel ?? `Copy ${value}`}
      className={cn(
        "group inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 -mx-1.5",
        "font-mono text-[12.5px] text-ink-muted",
        "transition-colors duration-200 ease-standard hover:bg-raised hover:text-ink",
        className,
      )}
    >
      <span className="truncate">{display ?? truncateMiddle(value)}</span>
      {copied ? (
        <Check size={13} className="shrink-0 text-good" aria-hidden="true" />
      ) : (
        <Copy size={13} className="shrink-0 opacity-50 group-hover:opacity-100" aria-hidden="true" />
      )}
      <span className="sr-only" role="status">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
