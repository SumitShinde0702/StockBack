import { crcHex } from "./crc";
import {
  ADDITIONAL_DATA_LABELS,
  CURRENCY_BY_NUMERIC,
  PAYNOW_LABELS,
  PROXY_TYPES,
  SGQR_IDENTITY_LABELS,
  isTemplateTag,
  labelForRootTag,
} from "./tags";
import type {
  AdditionalData,
  MerchantAccount,
  PayNowAccount,
  SgqrIdentity,
  SgqrParseError,
  SgqrParseResult,
  SgqrPayload,
  TlvNode,
} from "./types";

const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;
const TWO_DIGITS = /^\d{2}$/;
/** Tag 54: up to 13 characters, digits with at most one decimal point. */
const AMOUNT_FORMAT = /^\d{1,10}(\.\d{1,2})?$/;

function fail(code: SgqrParseError["code"], message: string, offset?: number): SgqrParseResult {
  return { ok: false, error: { code, message, offset } };
}

interface TlvParse {
  nodes: TlvNode[];
  error?: SgqrParseError;
}

/**
 * Walks a flat `IILLVV...` sequence. Templates are recursed into; a malformed child
 * template is reported as a warning by the caller rather than failing the whole parse,
 * because unknown proprietary schemes legitimately carry opaque payloads.
 */
function parseTlvSequence(
  input: string,
  labelFor: (id: string) => string,
  baseOffset = 0,
  recurse = true,
): TlvParse {
  const nodes: TlvNode[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const absolute = baseOffset + cursor;

    if (input.length - cursor < 4) {
      return {
        nodes,
        error: {
          code: "MALFORMED_TLV",
          message: `Truncated data object at position ${absolute}: need at least 4 characters for an ID and length.`,
          offset: absolute,
        },
      };
    }

    const id = input.slice(cursor, cursor + 2);
    const rawLength = input.slice(cursor + 2, cursor + 4);

    if (!TWO_DIGITS.test(id)) {
      return {
        nodes,
        error: {
          code: "MALFORMED_TLV",
          message: `Expected a 2-digit tag ID at position ${absolute}, found "${id}".`,
          offset: absolute,
        },
      };
    }

    if (!TWO_DIGITS.test(rawLength)) {
      return {
        nodes,
        error: {
          code: "MALFORMED_TLV",
          message: `Expected a 2-digit length for tag ${id} at position ${absolute + 2}, found "${rawLength}".`,
          offset: absolute + 2,
        },
      };
    }

    const length = Number(rawLength);
    const valueStart = cursor + 4;
    const valueEnd = valueStart + length;

    if (valueEnd > input.length) {
      return {
        nodes,
        error: {
          code: "MALFORMED_TLV",
          message: `Tag ${id} declares ${length} characters but only ${input.length - valueStart} remain.`,
          offset: absolute,
        },
      };
    }

    const value = input.slice(valueStart, valueEnd);
    const node: TlvNode = { id, length, value, label: labelFor(id) };

    if (recurse && isTemplateTag(id) && value.length > 0) {
      const childLabels =
        id === "62"
          ? (childId: string) => ADDITIONAL_DATA_LABELS[childId] ?? `Sub-tag ${childId}`
          : (childId: string) => subTemplateLabel(id, value, childId);
      const child = parseTlvSequence(value, childLabels, baseOffset + valueStart, false);
      // Opaque proprietary templates stay readable as a raw value.
      if (!child.error) node.children = child.nodes;
    }

    nodes.push(node);
    cursor = valueEnd;
  }

  return { nodes };
}

function subTemplateLabel(templateId: string, templateValue: string, childId: string): string {
  const guid = readSubTag(templateValue, "00")?.toUpperCase();
  if (guid === "SG.PAYNOW") return PAYNOW_LABELS[childId] ?? `Sub-tag ${childId}`;
  if (guid === "SG.SGQR") return SGQR_IDENTITY_LABELS[childId] ?? `Sub-tag ${childId}`;
  if (childId === "00") return "Globally unique identifier";
  return `Sub-tag ${childId}`;
}

function readSubTag(templateValue: string, id: string): string | null {
  const parsed = parseTlvSequence(templateValue, () => "", 0, false);
  const found = parsed.nodes.find((node) => node.id === id);
  return found ? found.value : null;
}

function toFieldMap(nodes: TlvNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const node of nodes) map[node.id] = node.value;
  return map;
}

function buildPayNow(templateId: string, fields: Record<string, string>): PayNowAccount {
  const proxyTypeCode = fields["01"] ?? "";
  return {
    guid: fields["00"] ?? "",
    templateId,
    proxyTypeCode,
    proxyType: PROXY_TYPES[proxyTypeCode] ?? "unknown",
    proxyValue: (fields["02"] ?? "").trim(),
    amountEditable: fields["03"] === undefined ? null : fields["03"] === "1",
    expiryDate: fields["04"] ?? null,
  };
}

function buildSgqrIdentity(fields: Record<string, string>): SgqrIdentity {
  return {
    guid: fields["00"] ?? "",
    sgqrId: fields["01"] ?? null,
    version: fields["02"] ?? null,
    postalCode: fields["03"] ?? null,
    levelNumber: fields["04"] ?? null,
    unitNumber: fields["05"] ?? null,
    miscellaneous: fields["06"] ?? null,
    versionDate: fields["07"] ?? null,
  };
}

function buildAdditionalData(fields: Record<string, string>): AdditionalData {
  return {
    billNumber: fields["01"] ?? null,
    mobileNumber: fields["02"] ?? null,
    storeLabel: fields["03"] ?? null,
    loyaltyNumber: fields["04"] ?? null,
    referenceLabel: fields["05"] ?? null,
    customerLabel: fields["06"] ?? null,
    terminalLabel: fields["07"] ?? null,
    purposeOfTransaction: fields["08"] ?? null,
    additionalConsumerDataRequest: fields["09"] ?? null,
  };
}

/** Converts an EMVCo amount string to cents without going through a float. */
export function amountToMinorUnits(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const cents = `${fraction}00`.slice(0, 2);
  return BigInt(whole || "0") * 100n + BigInt(cents);
}

export function parseSgqr(input: string): SgqrParseResult {
  const raw = input.trim();

  if (raw.length === 0) {
    return fail("EMPTY", "Nothing to decode. Scan a code or paste an SGQR payload.");
  }

  // A valid payload needs at least `000201` plus a `6304xxxx` checksum.
  if (raw.length < 14) {
    return fail("TOO_SHORT", `Payload is ${raw.length} characters; a valid SGQR code is far longer.`);
  }

  if (!PRINTABLE_ASCII.test(raw)) {
    return fail(
      "INVALID_CHARSET",
      "Payload contains characters outside the printable ASCII range that EMVCo permits.",
    );
  }

  // The checksum must be the final data object, so its position is fixed.
  if (raw.slice(-8, -4) !== "6304") {
    return fail(
      "MISSING_CRC",
      "Payload does not end with a `6304` checksum tag, so it is not a complete EMVCo code.",
      raw.length - 8,
    );
  }

  const providedCrc = raw.slice(-4).toUpperCase();
  const expectedCrc = crcHex(raw.slice(0, -4));
  if (providedCrc !== expectedCrc) {
    return fail(
      "CRC_MISMATCH",
      `Checksum failed: the code declares ${providedCrc} but its contents hash to ${expectedCrc}. The scan is corrupt or the code was altered.`,
      raw.length - 4,
    );
  }

  const { nodes, error } = parseTlvSequence(raw, labelForRootTag);
  if (error) return { ok: false, error };

  const root = toFieldMap(nodes);
  const warnings: string[] = [];

  const payloadFormatIndicator = root["00"];
  if (payloadFormatIndicator === undefined) {
    return fail("MISSING_PAYLOAD_FORMAT", "Tag 00 (payload format indicator) is absent.");
  }
  if (payloadFormatIndicator !== "01") {
    return fail(
      "UNSUPPORTED_PAYLOAD_FORMAT",
      `Payload format indicator is "${payloadFormatIndicator}"; only EMVCo MPM version "01" is supported.`,
    );
  }

  const currencyNumeric = root["53"];
  if (currencyNumeric === undefined) {
    return fail("MISSING_CURRENCY", "Tag 53 (transaction currency) is absent.");
  }

  const amountRaw = root["54"];
  let amount: string | null = null;
  let amountMinor: bigint | null = null;
  if (amountRaw !== undefined && amountRaw.length > 0) {
    if (!AMOUNT_FORMAT.test(amountRaw)) {
      return fail(
        "INVALID_AMOUNT",
        `Tag 54 value "${amountRaw}" is not a valid EMVCo amount.`,
      );
    }
    amount = amountRaw;
    amountMinor = amountToMinorUnits(amountRaw);
  }

  const initiationMethod = root["01"] === "12" ? "dynamic" : "static";
  if (root["01"] === undefined) {
    warnings.push("Tag 01 is absent; treating the code as static, which is the EMVCo default.");
  }
  if (initiationMethod === "dynamic" && amount === null) {
    warnings.push("Code is marked dynamic but carries no amount.");
  }

  const merchantAccounts: MerchantAccount[] = [];
  let payNow: PayNowAccount | null = null;
  let sgqrIdentity: SgqrIdentity | null = null;

  for (const node of nodes) {
    const id = Number(node.id);
    if (!Number.isInteger(id) || id < 2 || id > 51) continue;

    const fields = node.children ? toFieldMap(node.children) : {};
    const guid = fields["00"] ?? null;
    merchantAccounts.push({ templateId: node.id, guid, fields });

    const upper = guid?.toUpperCase();
    if (upper === "SG.PAYNOW" && !payNow) payNow = buildPayNow(node.id, fields);
    if (upper === "SG.SGQR" && !sgqrIdentity) sgqrIdentity = buildSgqrIdentity(fields);
  }

  if (merchantAccounts.length === 0) {
    warnings.push("No merchant account template (tags 02-51) was found.");
  }
  if (!payNow) {
    warnings.push("No PayNow template found; this code routes through another scheme.");
  } else if (payNow.proxyType === "unknown") {
    warnings.push(`Unrecognised PayNow proxy type "${payNow.proxyTypeCode}".`);
  }

  const additionalNode = nodes.find((node) => node.id === "62");
  const additionalData = additionalNode?.children
    ? buildAdditionalData(toFieldMap(additionalNode.children))
    : null;

  const countryCode = root["58"] ?? null;
  if (countryCode && countryCode.toUpperCase() !== "SG") {
    warnings.push(`Country code is "${countryCode}"; this build targets Singapore codes.`);
  }

  const value: SgqrPayload = {
    raw,
    payloadFormatIndicator,
    initiationMethod,
    merchantAccounts,
    payNow,
    sgqrIdentity,
    merchantCategoryCode: root["52"] ?? null,
    currency: {
      numeric: currencyNumeric,
      alpha: CURRENCY_BY_NUMERIC[currencyNumeric] ?? null,
    },
    amount,
    amountMinor,
    countryCode,
    merchantName: root["59"]?.trim() || null,
    merchantCity: root["60"]?.trim() || null,
    postalCode: root["61"] ?? null,
    additionalData,
    crc: providedCrc,
    tlv: nodes,
    warnings,
  };

  return { ok: true, value };
}
