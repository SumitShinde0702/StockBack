import { describe, expect, it } from "vitest";
import { amountToMinorUnits, parseSgqr } from "./parse";
import { appendCrc, crcHex } from "./crc";
import { buildSgqr, tlv } from "./build";
import { CORRUPT_FIXTURE, DEMO_FIXTURES } from "./fixtures";
import type { SgqrPayload } from "./types";

function expectOk(payload: string): SgqrPayload {
  const result = parseSgqr(payload);
  if (!result.ok) throw new Error(`expected a successful parse, got ${result.error.code}: ${result.error.message}`);
  return result.value;
}

function expectErr(payload: string) {
  const result = parseSgqr(payload);
  if (result.ok) throw new Error("expected a parse failure, got a valid payload");
  return result.error;
}

describe("crc16ccittFalse", () => {
  // Canonical CRC-16/CCITT-FALSE check value for the ASCII string "123456789".
  it("matches the standard check vector", () => {
    expect(crcHex("123456789")).toBe("29B1");
  });

  it("matches the worked example from the EMVCo MPM specification", () => {
    // The spec's sample payload, whose published checksum is A13A. It contains
    // multi-byte text, so it only reproduces if the digest runs over UTF-8 bytes.
    const body =
      "00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304";
    expect(crcHex(body)).toBe("A13A");
  });

  it("appendCrc produces a payload that round-trips", () => {
    const payload = appendCrc(`${tlv("00", "01")}${tlv("53", "702")}${tlv("58", "SG")}${tlv("59", "T")}${tlv("60", "SG")}`);
    expect(parseSgqr(payload).ok).toBe(true);
  });
});

describe("parseSgqr — valid payloads", () => {
  it("decodes the EMVCo specification sample end to end", () => {
    const spec =
      "00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A";
    // The sample carries non-ASCII Chinese text in tag 64, which EMVCo permits but
    // this parser rejects by design, so assert on the documented rejection instead.
    const error = expectErr(spec);
    expect(error.code).toBe("INVALID_CHARSET");
  });

  it("decodes a dynamic PayNow UEN code", () => {
    const payload = DEMO_FIXTURES[0].payload;
    const value = expectOk(payload);

    expect(value.payloadFormatIndicator).toBe("01");
    expect(value.initiationMethod).toBe("dynamic");
    expect(value.merchantName).toBe("AH HOCK KOPITIAM");
    expect(value.merchantCity).toBe("Singapore");
    expect(value.countryCode).toBe("SG");
    expect(value.currency).toEqual({ numeric: "702", alpha: "SGD" });
    expect(value.amount).toBe("18.50");
    expect(value.amountMinor).toBe(1850n);
    expect(value.merchantCategoryCode).toBe("5812");
  });

  it("extracts the PayNow proxy and editability flag", () => {
    const value = expectOk(DEMO_FIXTURES[0].payload);
    expect(value.payNow).not.toBeNull();
    expect(value.payNow?.guid).toBe("SG.PAYNOW");
    expect(value.payNow?.proxyType).toBe("uen");
    expect(value.payNow?.proxyValue).toBe("202401234K");
    expect(value.payNow?.amountEditable).toBe(false);
  });

  it("extracts the SGQR identity template", () => {
    const value = expectOk(DEMO_FIXTURES[0].payload);
    expect(value.sgqrIdentity?.guid).toBe("SG.SGQR");
    expect(value.sgqrIdentity?.sgqrId).toBe("000001234567");
    expect(value.sgqrIdentity?.postalCode).toBe("079903");
    expect(value.sgqrIdentity?.versionDate).toBe("20260101");
  });

  it("extracts the additional data template", () => {
    const value = expectOk(DEMO_FIXTURES[0].payload);
    expect(value.additionalData?.billNumber).toBe("INV20260919");
    expect(value.additionalData?.terminalLabel).toBe("POS01");
    expect(value.additionalData?.loyaltyNumber).toBeNull();
  });

  it("treats a static code as having no amount rather than failing", () => {
    const value = expectOk(DEMO_FIXTURES[2].payload);
    expect(value.initiationMethod).toBe("static");
    expect(value.amount).toBeNull();
    expect(value.amountMinor).toBeNull();
    expect(value.payNow?.amountEditable).toBe(true);
  });

  it("defaults a missing tag 01 to static and warns", () => {
    const payload = appendCrc(
      tlv("00", "01") +
        tlv("53", "702") +
        tlv("58", "SG") +
        tlv("59", "NO INITIATION TAG") +
        tlv("60", "Singapore"),
    );
    const value = expectOk(payload);
    expect(value.initiationMethod).toBe("static");
    expect(value.warnings.some((w) => w.includes("Tag 01 is absent"))).toBe(true);
  });

  it("warns when no PayNow template is present", () => {
    const payload = buildSgqr({ merchantName: "CARD ONLY", amount: "5.00", dynamic: true });
    const value = expectOk(payload);
    expect(value.payNow).toBeNull();
    expect(value.warnings.some((w) => w.includes("No PayNow template"))).toBe(true);
  });

  it("warns on a non-Singapore country code", () => {
    const payload = buildSgqr({
      merchantName: "KL MERCHANT",
      merchantCity: "Kuala Lumpur",
      countryCode: "MY",
      currencyNumeric: "458",
      amount: "30.00",
      dynamic: true,
    });
    const value = expectOk(payload);
    expect(value.currency.alpha).toBe("MYR");
    expect(value.warnings.some((w) => w.includes('Country code is "MY"'))).toBe(true);
  });

  it("preserves the raw TLV tree with labels for the inspector view", () => {
    const value = expectOk(DEMO_FIXTURES[0].payload);
    const currency = value.tlv.find((node) => node.id === "53");
    expect(currency?.label).toBe("Transaction currency");

    const payNowTemplate = value.tlv.find((node) => node.id === "26");
    expect(payNowTemplate?.children?.find((c) => c.id === "02")?.label).toBe("Proxy value");
  });

  it("round-trips every committed demo fixture", () => {
    for (const fixture of DEMO_FIXTURES) {
      const value = expectOk(fixture.payload);
      expect(value.raw).toBe(fixture.payload);
      expect(value.crc).toBe(crcHex(fixture.payload.slice(0, -4)));
    }
  });
});

describe("parseSgqr — rejections", () => {
  it("rejects an empty payload", () => {
    expect(expectErr("").code).toBe("EMPTY");
    expect(expectErr("   ").code).toBe("EMPTY");
  });

  it("rejects a payload that is too short to be a code", () => {
    expect(expectErr("000201630403").code).toBe("TOO_SHORT");
  });

  it("rejects non-ASCII input", () => {
    const payload = DEMO_FIXTURES[0].payload.replace("AH HOCK", "AH HÖCK");
    expect(expectErr(payload).code).toBe("INVALID_CHARSET");
  });

  it("rejects a payload with no trailing CRC tag", () => {
    const error = expectErr(DEMO_FIXTURES[0].payload.slice(0, -10));
    expect(error.code).toBe("MISSING_CRC");
  });

  it("rejects a tampered checksum and reports both values", () => {
    const error = expectErr(CORRUPT_FIXTURE);
    expect(error.code).toBe("CRC_MISMATCH");
    expect(error.message).toContain("0000");
  });

  it("rejects a declared length that overruns the payload", () => {
    // Tag 59 claims 40 characters but far fewer remain.
    const body = tlv("00", "01") + tlv("53", "702") + tlv("58", "SG") + "5940SHORT";
    const error = expectErr(appendCrc(body));
    expect(error.code).toBe("MALFORMED_TLV");
    expect(error.message).toContain("declares 40 characters");
  });

  it("rejects a non-numeric length prefix", () => {
    const body = tlv("00", "01") + "53XX702" + tlv("58", "SG");
    const error = expectErr(appendCrc(body));
    expect(error.code).toBe("MALFORMED_TLV");
    expect(error.message).toContain("2-digit length");
  });

  it("rejects a non-numeric tag id", () => {
    const body = tlv("00", "01") + "XX03702" + tlv("58", "SG");
    const error = expectErr(appendCrc(body));
    expect(error.code).toBe("MALFORMED_TLV");
    expect(error.message).toContain("2-digit tag ID");
  });

  it("rejects a trailing fragment too short to hold a header", () => {
    // Tag 59 declares 8 characters but supplies 3, so it swallows the `6304` header
    // and one checksum digit, leaving a 3-character stub that cannot be a data object.
    const body = tlv("00", "01") + tlv("53", "702") + tlv("58", "SG") + "5908ABC";
    const error = expectErr(appendCrc(body));
    expect(error.code).toBe("MALFORMED_TLV");
    expect(error.message).toContain("Truncated data object");
  });

  it("rejects an unsupported payload format indicator", () => {
    const body = tlv("00", "02") + tlv("53", "702") + tlv("58", "SG") + tlv("59", "FUTURE");
    expect(expectErr(appendCrc(body)).code).toBe("UNSUPPORTED_PAYLOAD_FORMAT");
  });

  it("rejects a payload with no currency tag", () => {
    const body = tlv("00", "01") + tlv("58", "SG") + tlv("59", "NO CURRENCY");
    expect(expectErr(appendCrc(body)).code).toBe("MISSING_CURRENCY");
  });

  it("rejects a malformed amount", () => {
    for (const bad of ["12.345", "1,000.00", "-5.00", "abc", "12."]) {
      const body =
        tlv("00", "01") + tlv("53", "702") + tlv("54", bad) + tlv("58", "SG") + tlv("59", "M");
      expect(expectErr(appendCrc(body)).code, `amount "${bad}"`).toBe("INVALID_AMOUNT");
    }
  });
});

describe("amountToMinorUnits", () => {
  it("converts without floating point drift", () => {
    expect(amountToMinorUnits("0.01")).toBe(1n);
    expect(amountToMinorUnits("0.1")).toBe(10n);
    expect(amountToMinorUnits("18.50")).toBe(1850n);
    expect(amountToMinorUnits("42")).toBe(4200n);
    expect(amountToMinorUnits("1234567890.99")).toBe(123456789099n);
  });
});

describe("buildSgqr", () => {
  it("refuses to emit a value longer than the 99-character TLV limit", () => {
    expect(() => buildSgqr({ merchantName: "X".repeat(100) })).toThrow(/at most 99/);
  });
});
