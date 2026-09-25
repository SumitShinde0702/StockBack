import QRCode from "qrcode";
import { DEMO_FIXTURES } from "@stockback/sgqr";
import { MERCHANT_REGISTRY } from "@/lib/config";

export interface SellerCode {
  id: string;
  title: string;
  blurb: string;
  payload: string;
  registered: boolean;
  category: string | null;
  amountLabel: string;
  qrSvg: string;
}

/**
 * Builds the merchant-facing QR stickers used on `/seller`.
 * The encoded string is a full EMVCo SGQR payload — the same bytes the phone app parses.
 */
export async function getSellerCodes(): Promise<SellerCode[]> {
  return Promise.all(
    DEMO_FIXTURES.map(async (fixture) => {
      const uen = Object.keys(MERCHANT_REGISTRY).find((value) => fixture.payload.includes(value));
      const merchant = uen ? MERCHANT_REGISTRY[uen] : null;
      const amountMatch = fixture.blurb.match(/S\$[\d.]+/);

      const qrSvg = await QRCode.toString(fixture.payload, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        width: 280,
        color: { dark: "#0e1320ff", light: "#ffffffff" },
      });

      return {
        id: fixture.id,
        title: fixture.title,
        blurb: fixture.blurb,
        payload: fixture.payload,
        registered: Boolean(merchant),
        category: merchant?.category ?? null,
        amountLabel: amountMatch?.[0] ?? (fixture.id === "hawker" ? "Enter amount" : "Invoice"),
        qrSvg,
      };
    }),
  );
}
