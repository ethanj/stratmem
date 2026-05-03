/**
 * Small CBOR subset for TacNet metadata frames.
 *
 * Supports unsigned integers, strings, arrays, maps, booleans, null, and byte
 * strings. That is enough for the P0 metadata frame and avoids a dependency.
 */
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeFrame(frame) {
  return encodeValue(frame);
}

export function decodeFrame(bytes) {
  const reader = new CborReader(bytes);
  return reader.read();
}

export function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

export function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function concat(chunks) {
  const total = chunks.reduce((size, chunk) => size + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function head(major, length) {
  if (length < 24) {
    return Uint8Array.of((major << 5) | length);
  }
  if (length < 256) {
    return Uint8Array.of((major << 5) | 24, length);
  }
  if (length < 65536) {
    return Uint8Array.of((major << 5) | 25, length >> 8, length & 255);
  }
  return Uint8Array.of(
    (major << 5) | 26,
    (length >>> 24) & 255,
    (length >>> 16) & 255,
    (length >>> 8) & 255,
    length & 255,
  );
}

function encodeValue(value) {
  if (value === null || value === undefined) {
    return Uint8Array.of(0xf6);
  }
  if (value === false) {
    return Uint8Array.of(0xf4);
  }
  if (value === true) {
    return Uint8Array.of(0xf5);
  }
  if (Number.isInteger(value) && value >= 0) {
    return head(0, value);
  }
  if (typeof value === "string") {
    const bytes = textEncoder.encode(value);
    return concat([head(3, bytes.length), bytes]);
  }
  if (value instanceof Uint8Array) {
    return concat([head(2, value.length), value]);
  }
  if (Array.isArray(value)) {
    return concat([head(4, value.length), ...value.map(encodeValue)]);
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    const chunks = [head(5, entries.length)];
    for (const [key, nested] of entries) {
      const numericKey = Number.parseInt(key, 10);
      chunks.push(encodeValue(Number.isNaN(numericKey) ? key : numericKey));
      chunks.push(encodeValue(nested));
    }
    return concat(chunks);
  }
  throw new Error(`Unsupported CBOR value: ${String(value)}`);
}

class CborReader {
  constructor(bytes) {
    this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.offset = 0;
  }

  read() {
    const first = this.readByte();
    const major = first >> 5;
    const additional = first & 31;
    const length = this.readLength(additional);

    if (major === 0) return length;
    if (major === 2) return this.readBytes(length);
    if (major === 3) return textDecoder.decode(this.readBytes(length));
    if (major === 4) return this.readArray(length);
    if (major === 5) return this.readMap(length);
    if (major === 7) return this.readSimple(additional);
    throw new Error(`Unsupported CBOR major type: ${major}`);
  }

  readByte() {
    if (this.offset >= this.bytes.length) {
      throw new Error("Unexpected end of CBOR data");
    }
    const byte = this.bytes[this.offset];
    this.offset += 1;
    return byte;
  }

  readLength(additional) {
    if (additional < 24) return additional;
    if (additional === 24) return this.readByte();
    if (additional === 25) return (this.readByte() << 8) | this.readByte();
    if (additional === 26) {
      return (
        (this.readByte() << 24) |
        (this.readByte() << 16) |
        (this.readByte() << 8) |
        this.readByte()
      ) >>> 0;
    }
    if (additional >= 20 && additional <= 23) return additional;
    throw new Error(`Unsupported CBOR length type: ${additional}`);
  }

  readBytes(length) {
    const end = this.offset + length;
    if (end > this.bytes.length) {
      throw new Error("CBOR byte string exceeds input length");
    }
    const out = this.bytes.slice(this.offset, end);
    this.offset = end;
    return out;
  }

  readArray(length) {
    const out = [];
    for (let index = 0; index < length; index += 1) {
      out.push(this.read());
    }
    return out;
  }

  readMap(length) {
    const out = {};
    for (let index = 0; index < length; index += 1) {
      out[this.read()] = this.read();
    }
    return out;
  }

  readSimple(additional) {
    if (additional === 20) return false;
    if (additional === 21) return true;
    if (additional === 22) return null;
    throw new Error(`Unsupported CBOR simple value: ${additional}`);
  }
}
