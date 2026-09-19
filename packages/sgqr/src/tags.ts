/** Root-level EMVCo MPM tag names, used by the raw inspector view. */
export const ROOT_TAG_LABELS: Record<string, string> = {
  "00": "Payload format indicator",
  "01": "Point of initiation method",
  "51": "SGQR identity template",
  "52": "Merchant category code",
  "53": "Transaction currency",
  "54": "Transaction amount",
  "55": "Tip or convenience indicator",
  "56": "Convenience fee (fixed)",
  "57": "Convenience fee (percentage)",
  "58": "Country code",
  "59": "Merchant name",
  "60": "Merchant city",
  "61": "Postal code",
  "62": "Additional data template",
  "63": "CRC",
  "64": "Merchant information (language)",
};

export const ADDITIONAL_DATA_LABELS: Record<string, string> = {
  "01": "Bill number",
  "02": "Mobile number",
  "03": "Store label",
  "04": "Loyalty number",
  "05": "Reference label",
  "06": "Customer label",
  "07": "Terminal label",
  "08": "Purpose of transaction",
  "09": "Additional consumer data request",
};

export const PAYNOW_LABELS: Record<string, string> = {
  "00": "Globally unique identifier",
  "01": "Proxy type",
  "02": "Proxy value",
  "03": "Amount editable",
  "04": "Expiry date",
};

export const SGQR_IDENTITY_LABELS: Record<string, string> = {
  "00": "Globally unique identifier",
  "01": "SGQR ID number",
  "02": "Version",
  "03": "Postal code",
  "04": "Level number",
  "05": "Unit number",
  "06": "Miscellaneous",
  "07": "Version date",
};

function inRange(id: string, lo: number, hi: number) {
  const n = Number(id);
  return Number.isInteger(n) && n >= lo && n <= hi;
}

/** True for tags whose value is itself a TLV sequence. */
export function isTemplateTag(id: string): boolean {
  return (
    inRange(id, 26, 51) || id === "62" || id === "64" || inRange(id, 80, 99)
  );
}

export function labelForRootTag(id: string): string {
  if (ROOT_TAG_LABELS[id]) return ROOT_TAG_LABELS[id];
  if (inRange(id, 2, 25)) return `Merchant account information (${id})`;
  if (inRange(id, 26, 50)) return `Merchant account template (${id})`;
  if (inRange(id, 65, 79)) return `Reserved for future use (${id})`;
  if (inRange(id, 80, 99)) return `Unreserved template (${id})`;
  return `Unknown tag (${id})`;
}

/** ISO 4217 numeric to alpha, limited to codes plausible on a Singapore QR. */
export const CURRENCY_BY_NUMERIC: Record<string, string> = {
  "036": "AUD",
  "156": "CNY",
  "344": "HKD",
  "356": "INR",
  "360": "IDR",
  "392": "JPY",
  "410": "KRW",
  "458": "MYR",
  "608": "PHP",
  "702": "SGD",
  "704": "VND",
  "764": "THB",
  "826": "GBP",
  "840": "USD",
  "978": "EUR",
};

/** PayNow proxy type codes (tag 26-01). */
export const PROXY_TYPES: Record<string, "mobile" | "uen" | "vpa"> = {
  "0": "mobile",
  "2": "uen",
  "3": "vpa",
};
