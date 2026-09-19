/**
 * OKX public market data.
 *
 * Only unauthenticated v5 endpoints are used. No API key, no `POST /trade/order`, and no
 * Earn subscription is involved anywhere in this build; treasury replenishment is an
 * operator workflow documented in docs/LIMITATIONS.md, not something the app performs.
 */

const OKX_BASE = "https://www.okx.com";

export interface TickerQuote {
  instId: string;
  /** Last traded price as OKX returned it, kept as a string to avoid float drift. */
  last: string;
  /** 24h open, used for the change indicator. */
  open24h: string | null;
  ts: number;
  source: "okx" | "fallback";
}

/**
 * Prices used when OKX is unreachable or the instrument is not listed. Any quote built
 * from these is labelled `fallback` and the UI says so; it is never presented as live.
 */
export const FALLBACK_PRICES: Record<string, string> = {
  "USDC-USDT": "1.0002",
  "ETH-USDT": "3120.45",
  "OKB-USDT": "48.72",
  "XNVDA-USDT": "184.26",
  "XAAPL-USDT": "241.80",
  "XTSLA-USDT": "409.15",
  "USD-SGD": "1.2840",
};

interface OkxTickerResponse {
  code: string;
  msg: string;
  data?: Array<{ instId: string; last: string; open24h: string; ts: string }>;
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`OKX responded ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTicker(instId: string, timeoutMs = 4000): Promise<TickerQuote> {
  try {
    const json = (await fetchJson(
      `${OKX_BASE}/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`,
      timeoutMs,
    )) as OkxTickerResponse;

    const row = json.code === "0" ? json.data?.[0] : undefined;
    if (!row?.last) throw new Error(json.msg || `No ticker data for ${instId}`);

    return {
      instId,
      last: row.last,
      open24h: row.open24h ?? null,
      ts: Number(row.ts) || Date.now(),
      source: "okx",
    };
  } catch {
    const fallback = FALLBACK_PRICES[instId];
    if (!fallback) throw new Error(`No live or fallback price available for ${instId}.`);
    return { instId, last: fallback, open24h: null, ts: Date.now(), source: "fallback" };
  }
}

export async function fetchTickers(instIds: string[]): Promise<Record<string, TickerQuote>> {
  const results = await Promise.all(instIds.map((id) => fetchTicker(id)));
  return Object.fromEntries(results.map((r) => [r.instId, r]));
}

/** Reciprocal of a decimal price string, kept at 18 decimal places. */
export function invertPrice(price: string): string {
  const scale = 10n ** 18n;
  const [whole = "0", fraction = ""] = price.split(".");
  const scaled = BigInt(whole) * scale + BigInt(fraction.padEnd(18, "0").slice(0, 18));
  if (scaled === 0n) throw new Error("Cannot invert a zero price.");
  const inverted = (scale * scale) / scaled;
  const w = inverted / scale;
  const f = (inverted % scale).toString().padStart(18, "0").replace(/0+$/, "");
  return f ? `${w}.${f}` : w.toString();
}

/** Fetches a USD mark, inverting the ticker when the asset is the quote currency. */
export async function fetchUsdPrice(instId: string, invert = false): Promise<TickerQuote> {
  const ticker = await fetchTicker(instId);
  return invert ? { ...ticker, last: invertPrice(ticker.last) } : ticker;
}

/**
 * SGD per USD. OKX quotes crypto, not fiat pairs, so this is derived from the
 * USDC-SGD spot market where available and falls back to a pinned rate otherwise.
 */
export async function fetchSgdPerUsd(): Promise<TickerQuote> {
  try {
    const json = (await fetchJson(
      `${OKX_BASE}/api/v5/market/ticker?instId=USDC-SGD`,
      4000,
    )) as OkxTickerResponse;
    const row = json.code === "0" ? json.data?.[0] : undefined;
    if (!row?.last) throw new Error("no USDC-SGD market");
    return {
      instId: "USD-SGD",
      last: row.last,
      open24h: row.open24h ?? null,
      ts: Number(row.ts) || Date.now(),
      source: "okx",
    };
  } catch {
    return {
      instId: "USD-SGD",
      last: FALLBACK_PRICES["USD-SGD"],
      open24h: null,
      ts: Date.now(),
      source: "fallback",
    };
  }
}
