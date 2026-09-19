/** Formatting helpers. All monetary output is fixed-precision; never `toLocaleString` on a float. */

export function formatFiat(minorUnits: bigint | number, fractionDigits = 2): string {
  const minor = typeof minorUnits === "bigint" ? minorUnits : BigInt(Math.round(minorUnits));
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const cents = abs % 100n;
  const grouped = groupDigits(whole.toString());
  const body =
    fractionDigits === 0 ? grouped : `${grouped}.${cents.toString().padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

export function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Formats a token amount held in base units. */
export function formatUnits(value: bigint, decimals: number, displayDecimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  let fractionStr = fraction.toString().padStart(decimals, "0").slice(0, displayDecimals);
  if (displayDecimals > 0) fractionStr = fractionStr.padEnd(displayDecimals, "0");

  const body = displayDecimals > 0 ? `${groupDigits(whole.toString())}.${fractionStr}` : groupDigits(whole.toString());
  return negative ? `-${body}` : body;
}

/** Parses a decimal string into base units without touching a float. */
export function parseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!/^\d*(\.\d*)?$/.test(trimmed) || trimmed === "" || trimmed === ".") {
    throw new Error(`"${value}" is not a positive decimal number.`);
  }
  const [whole = "0", fraction = ""] = trimmed.split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

/** Price strings from OKX arrive as decimals; keep them exact by scaling to 1e18. */
export const PRICE_SCALE = 10n ** 18n;

export function priceToScaled(price: string): bigint {
  return parseUnits(price, 18);
}

export function formatPrice(price: number | string, digits = 2): string {
  const n = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(n)) return "—";
  return groupDigits(n.toFixed(digits));
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatRelativeSeconds(seconds: number): string {
  if (seconds < 1) return "just now";
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function shortAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}
