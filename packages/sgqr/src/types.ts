/** A single EMVCo ID-Length-Value data object. */
export interface TlvNode {
  id: string;
  length: number;
  value: string;
  /** Human-readable tag name, for the raw inspector view. */
  label: string;
  /** Populated for the nested templates (26-51, 62, 64, 80-99). */
  children?: TlvNode[];
}

export type ProxyType = "mobile" | "uen" | "vpa" | "unknown";

/** Tag 26 template where the GUID is `SG.PAYNOW`. */
export interface PayNowAccount {
  guid: string;
  templateId: string;
  proxyTypeCode: string;
  proxyType: ProxyType;
  proxyValue: string;
  /** Tag 03: whether the payer may edit the amount. Null when absent. */
  amountEditable: boolean | null;
  /** Tag 04, `YYYYMMDD` as printed. Null when absent. */
  expiryDate: string | null;
}

/** Any merchant account template (tags 02-51). */
export interface MerchantAccount {
  templateId: string;
  guid: string | null;
  fields: Record<string, string>;
}

/** Tag 51 template where the GUID is `SG.SGQR`. */
export interface SgqrIdentity {
  guid: string;
  sgqrId: string | null;
  version: string | null;
  postalCode: string | null;
  levelNumber: string | null;
  unitNumber: string | null;
  miscellaneous: string | null;
  versionDate: string | null;
}

export interface AdditionalData {
  billNumber: string | null;
  mobileNumber: string | null;
  storeLabel: string | null;
  loyaltyNumber: string | null;
  referenceLabel: string | null;
  customerLabel: string | null;
  terminalLabel: string | null;
  purposeOfTransaction: string | null;
  additionalConsumerDataRequest: string | null;
}

export interface SgqrPayload {
  raw: string;
  payloadFormatIndicator: string;
  /** Tag 01. Static codes carry no amount; the payer enters one. */
  initiationMethod: "static" | "dynamic";
  merchantAccounts: MerchantAccount[];
  payNow: PayNowAccount | null;
  sgqrIdentity: SgqrIdentity | null;
  merchantCategoryCode: string | null;
  currency: { numeric: string; alpha: string | null };
  /** Tag 54 exactly as printed, or null on a static code. */
  amount: string | null;
  /** Tag 54 converted to minor units (cents). Null when no amount is present. */
  amountMinor: bigint | null;
  countryCode: string | null;
  merchantName: string | null;
  merchantCity: string | null;
  postalCode: string | null;
  additionalData: AdditionalData | null;
  crc: string;
  tlv: TlvNode[];
  /** Non-fatal observations worth surfacing to the user. */
  warnings: string[];
}

export type SgqrErrorCode =
  | "EMPTY"
  | "TOO_SHORT"
  | "INVALID_CHARSET"
  | "MALFORMED_TLV"
  | "MISSING_PAYLOAD_FORMAT"
  | "UNSUPPORTED_PAYLOAD_FORMAT"
  | "MISSING_CRC"
  | "CRC_MISMATCH"
  | "MISSING_CURRENCY"
  | "INVALID_AMOUNT";

export interface SgqrParseError {
  code: SgqrErrorCode;
  message: string;
  /** Character offset into the raw payload, when the fault is positional. */
  offset?: number;
}

export type SgqrParseResult =
  | { ok: true; value: SgqrPayload }
  | { ok: false; error: SgqrParseError };
