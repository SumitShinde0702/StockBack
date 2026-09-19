const UTF8 = new TextEncoder();

/**
 * CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, no final xor.
 * EMVCo MPM specifies this over the whole payload including the `6304` tag header.
 *
 * The digest runs over UTF-8 bytes, not UTF-16 code units. Tag lengths elsewhere in
 * the format are counted in characters, so the two must not be conflated.
 */
export function crc16ccittFalse(input: string): number {
  const bytes = UTF8.encode(input);
  let crc = 0xffff;

  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc & 0xffff;
}

/** Uppercase 4-character hex, as it appears in tag 63. */
export function crcHex(input: string): string {
  return crc16ccittFalse(input).toString(16).toUpperCase().padStart(4, "0");
}

/** Appends a correct `6304xxxx` checksum to a payload body. */
export function appendCrc(body: string): string {
  const withTag = `${body}6304`;
  return `${withTag}${crcHex(withTag)}`;
}
