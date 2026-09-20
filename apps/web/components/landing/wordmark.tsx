import { cn } from "@/lib/cn";

/**
 * The mark is a QR corner finder bracket wrapped around a rising bar — the two halves of
 * the product, scan and stock, in one glyph.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M2 9V4a2 2 0 0 1 2-2h5M24 9V4a2 2 0 0 0-2-2h-5M2 17v5a2 2 0 0 0 2 2h5M24 17v5a2 2 0 0 1-2 2h-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-ink-subtle"
        />
        <rect x="8" y="14" width="3" height="5" rx="1" className="fill-gold/50" />
        <rect x="12.5" y="10" width="3" height="9" rx="1" className="fill-gold/75" />
        <rect x="17" y="6" width="3" height="13" rx="1" className="fill-gold" />
      </svg>
      <span className="text-[16px] font-semibold tracking-[-0.02em] text-ink">StockBack</span>
    </span>
  );
}
