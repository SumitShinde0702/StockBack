import { appendCrc } from "./crc";

/**
 * Builds syntactically valid EMVCo MPM payloads.
 * Used for test fixtures and for the rehearsed demo codes; it is not a merchant
 * onboarding tool and the identifiers it emits are fictional.
 */
export interface SgqrBuildSpec {
  dynamic?: boolean;
  payNow?: {
    proxyType: "uen" | "mobile";
    proxyValue: string;
    amountEditable?: boolean;
    expiryDate?: string;
  };
  sgqr?: {
    sgqrId: string;
    version?: string;
    postalCode?: string;
    levelNumber?: string;
    unitNumber?: string;
    versionDate?: string;
  };
  merchantCategoryCode?: string;
  currencyNumeric?: string;
  amount?: string;
  countryCode?: string;
  merchantName: string;
  merchantCity?: string;
  postalCode?: string;
  additional?: {
    billNumber?: string;
    storeLabel?: string;
    referenceLabel?: string;
    terminalLabel?: string;
  };
}

export function tlv(id: string, value: string): string {
  if (value.length > 99) {
    throw new Error(`Tag ${id} value is ${value.length} characters; EMVCo allows at most 99.`);
  }
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function optional(id: string, value: string | undefined): string {
  return value === undefined || value === "" ? "" : tlv(id, value);
}

export function buildSgqr(spec: SgqrBuildSpec): string {
  let body = tlv("00", "01");
  body += tlv("01", spec.dynamic ? "12" : "11");

  if (spec.payNow) {
    const inner =
      tlv("00", "SG.PAYNOW") +
      tlv("01", spec.payNow.proxyType === "uen" ? "2" : "0") +
      tlv("02", spec.payNow.proxyValue) +
      tlv("03", spec.payNow.amountEditable ? "1" : "0") +
      optional("04", spec.payNow.expiryDate);
    body += tlv("26", inner);
  }

  if (spec.sgqr) {
    const inner =
      tlv("00", "SG.SGQR") +
      tlv("01", spec.sgqr.sgqrId) +
      optional("02", spec.sgqr.version) +
      optional("03", spec.sgqr.postalCode) +
      optional("04", spec.sgqr.levelNumber) +
      optional("05", spec.sgqr.unitNumber) +
      optional("07", spec.sgqr.versionDate);
    body += tlv("51", inner);
  }

  body += optional("52", spec.merchantCategoryCode);
  body += tlv("53", spec.currencyNumeric ?? "702");
  body += optional("54", spec.amount);
  body += tlv("58", spec.countryCode ?? "SG");
  body += tlv("59", spec.merchantName);
  body += tlv("60", spec.merchantCity ?? "Singapore");
  body += optional("61", spec.postalCode);

  if (spec.additional) {
    const inner =
      optional("01", spec.additional.billNumber) +
      optional("03", spec.additional.storeLabel) +
      optional("05", spec.additional.referenceLabel) +
      optional("07", spec.additional.terminalLabel);
    if (inner) body += tlv("62", inner);
  }

  return appendCrc(body);
}
