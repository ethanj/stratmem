/**
 * Browser-safe identifier helpers for peer and log correlation.
 *
 * The demo must work from a plain HTTP LAN address. Some browser crypto APIs,
 * including randomUUID, are restricted to secure contexts, so this module uses
 * getRandomValues with a timestamp fallback for local hackathon diagnostics.
 */
export function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    fillWithTimestampFallback(bytes);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function fillWithTimestampFallback(bytes) {
  let seed = Date.now() ^ Math.floor(Math.random() * 0xffffffff);
  for (let index = 0; index < bytes.length; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    bytes[index] = seed & 0xff;
  }
}

function formatUuid(bytes) {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
