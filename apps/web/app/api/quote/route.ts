import { NextResponse } from "next/server";
import { keccak256, toHex } from "viem";
import {
  BPS_DENOMINATOR,
  CONTRACTS,
  PAY_ASSETS,
  QUOTE_TTL_SECONDS,
  REWARD_ASSETS,
  REWARD_BPS,
  lookupMerchant,
} from "@/lib/config";
import { formatFiat, formatUnits } from "@/lib/format";
import { fetchSgdPerUsd, fetchTicker, fetchUsdPrice } from "@/lib/okx";
import { QuoteMathError, assertQuoteInvariant, computeQuote } from "@/lib/quote-math";
import type { QuoteErrorResponse, QuoteResponse } from "@/lib/quote-types";
import { signQuote } from "@/lib/quote-signer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QuoteRequestBody {
  proxyValue?: string;
  fiatMinorUnits?: string;
  payAssetSymbol?: string;
  rewardAssetSymbol?: string;
  /** Opaque, already-salted invoice reference from the client. */
  invoiceRef?: string;
  payerAddress?: string;
}

function bad(code: QuoteErrorResponse["code"], error: string, status = 400) {
  return NextResponse.json<QuoteErrorResponse>({ code, error }, { status });
}

function randomHex32(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as const;
}

export async function POST(request: Request) {
  let body: QuoteRequestBody;
  try {
    body = (await request.json()) as QuoteRequestBody;
  } catch {
    return bad("INVALID_REQUEST", "Request body must be JSON.");
  }

  const merchant = lookupMerchant(body.proxyValue);
  if (!merchant) {
    return bad(
      "UNSUPPORTED_MERCHANT",
      "This merchant has not registered an X Layer settlement address. An SGQR code identifies a fiat scheme, not a wallet, so payment cannot be routed onchain without the merchant opting in.",
    );
  }

  const payAsset = PAY_ASSETS.find((a) => a.symbol === body.payAssetSymbol);
  if (!payAsset) return bad("UNSUPPORTED_ASSET", `Unknown pay asset "${body.payAssetSymbol}".`);

  const rewardAsset =
    REWARD_ASSETS.find((a) => a.symbol === body.rewardAssetSymbol) ?? REWARD_ASSETS[0];

  let fiatMinorUnits: bigint;
  try {
    fiatMinorUnits = BigInt(body.fiatMinorUnits ?? "0");
  } catch {
    return bad("INVALID_REQUEST", "fiatMinorUnits must be an integer string.");
  }
  if (fiatMinorUnits <= 0n) {
    return bad("INVALID_REQUEST", "Invoice amount must be greater than zero.");
  }
  if (fiatMinorUnits > 100_000_00n) {
    return bad("INVALID_REQUEST", "Demo invoices are capped at S$100,000.");
  }

  const [payTicker, rewardTicker, fx] = await Promise.all([
    fetchUsdPrice(payAsset.instId, payAsset.invert).catch(() => null),
    fetchTicker(rewardAsset.instId).catch(() => null),
    fetchSgdPerUsd(),
  ]);

  if (!payTicker || !rewardTicker) {
    return bad(
      "PRICING_UNAVAILABLE",
      "Could not price this payment. OKX market data is unreachable and no fallback is configured for this pair.",
      503,
    );
  }

  let breakdown;
  try {
    breakdown = computeQuote({
      fiatMinorUnits,
      sgdPerUsd: fx.last,
      payTokenUsdPrice: payTicker.last,
      payTokenDecimals: payAsset.decimals,
      rewardTokenUsdPrice: rewardTicker.last,
      rewardTokenDecimals: rewardAsset.decimals,
    });
    assertQuoteInvariant(breakdown);
  } catch (error) {
    if (error instanceof QuoteMathError) return bad("AMOUNT_TOO_SMALL", error.message);
    throw error;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + QUOTE_TTL_SECONDS;
  const quoteId = randomHex32();
  const invoiceHash = keccak256(toHex(body.invoiceRef ?? quoteId));

  const leg = (units: bigint) => ({
    units: units.toString(),
    display: formatUnits(units, payAsset.decimals, payAsset.displayDecimals),
  });

  // The reward leg is 1.00% of the base, so its fiat value is 1.00% of the invoice.
  const rewardValueSgdMinor = (fiatMinorUnits * REWARD_BPS) / BPS_DENOMINATOR;

  const degraded =
    payTicker.source === "fallback" ||
    rewardTicker.source === "fallback" ||
    fx.source === "fallback";

  const signed = await signQuote({
    quoteId,
    invoiceHash,
    payer: body.payerAddress,
    merchant: merchant.settlementAddress,
    payToken: CONTRACTS.payToken,
    rewardToken: CONTRACTS.rewardToken,
    merchantAmount: breakdown.merchantUnits,
    protocolFee: breakdown.protocolUnits,
    rewardFee: breakdown.rewardFundingUnits,
    rewardUnits: breakdown.rewardTokenUnits,
    expiry: BigInt(expiresAt),
  });

  const response: QuoteResponse = {
    quoteId,
    invoiceHash,
    merchant: {
      uen: merchant.uen,
      displayName: merchant.displayName,
      category: merchant.category,
      settlementAddress: merchant.settlementAddress,
    },
    fiat: {
      currency: "SGD",
      minorUnits: fiatMinorUnits.toString(),
      display: formatFiat(fiatMinorUnits),
    },
    payAsset: {
      symbol: payAsset.symbol,
      decimals: payAsset.decimals,
      displayDecimals: payAsset.displayDecimals,
      priceUsd: payTicker.last,
      priceSource: payTicker.source,
    },
    fx: { sgdPerUsd: fx.last, source: fx.source },
    legs: {
      merchant: leg(breakdown.merchantUnits),
      protocol: leg(breakdown.protocolUnits),
      rewardFunding: leg(breakdown.rewardFundingUnits),
      gross: leg(breakdown.grossUnits),
    },
    reward: {
      symbol: rewardAsset.symbol,
      name: rewardAsset.name,
      decimals: rewardAsset.decimals,
      priceUsd: rewardTicker.last,
      priceSource: rewardTicker.source,
      units: breakdown.rewardTokenUnits.toString(),
      display: formatUnits(breakdown.rewardTokenUnits, rewardAsset.decimals, 6),
      valueMinorUnits: rewardValueSgdMinor.toString(),
    },
    issuedAt,
    expiresAt,
    signature: signed.signature,
    signerConfigured: signed.configured,
    degraded,
  };

  return NextResponse.json(response, {
    headers: { "cache-control": "no-store" },
  });
}
