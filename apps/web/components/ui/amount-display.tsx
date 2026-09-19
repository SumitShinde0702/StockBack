import { cn } from "@/lib/cn";

/**
 * The single largest element on any screen that shows money.
 * Currency symbol and decimals are de-emphasised so the magnitude reads first.
 */
export function AmountDisplay({
  currency,
  amount,
  size = "hero",
  tone = "default",
  className,
}: {
  currency: string;
  amount: string;
  size?: "hero" | "compact";
  tone?: "default" | "gold";
  className?: string;
}) {
  const [whole, fraction] = amount.split(".");

  return (
    <div
      className={cn(
        "tnum flex items-baseline gap-1.5 font-semibold tracking-[-0.03em]",
        tone === "gold" ? "text-gold" : "text-ink",
        className,
      )}
    >
      <span
        className={cn(
          "font-medium text-ink-muted",
          size === "hero" ? "text-[20px]" : "text-[13px]",
        )}
      >
        {currency}
      </span>
      <span className={size === "hero" ? "text-[44px] leading-none" : "text-[20px] leading-none"}>
        {whole}
        {fraction ? (
          <span className={cn(size === "hero" ? "text-[28px]" : "text-[15px]", "opacity-70")}>
            .{fraction}
          </span>
        ) : null}
      </span>
    </div>
  );
}
