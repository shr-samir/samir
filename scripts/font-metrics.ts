/**
 * Reads the vertical metrics of a WOFF2 font, used to tune fallback fonts so
 * text barely moves when the web font arrives (D4, F1a-D17).
 *
 * Run with `node scripts/font-metrics.ts public/fonts/<file>.woff2`.
 *
 * A WOFF2 file is a table directory followed by one Brotli-compressed stream
 * holding every table back to back. Only `head`, `hhea` and `OS/2` are needed,
 * and WOFF2 never transforms those, so they can be read straight from the
 * decompressed stream. Format: https://www.w3.org/TR/WOFF2/
 */
import { readFile } from "node:fs/promises";
import { brotliDecompressSync } from "node:zlib";

export interface FontMetrics {
  unitsPerEm: number;
  /** hhea ascender (font units, positive). */
  ascender: number;
  /** hhea descender (font units, negative). */
  descender: number;
  /** hhea line gap (font units). */
  lineGap: number;
  /** OS/2 average advance width (font units). */
  xAvgCharWidth: number;
}

/** Tags a WOFF2 table directory can reference by index (WOFF2 §5.1), up to those we need. */
const KNOWN_TAGS = ["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca"];

/** WOFF2's variable-length integer: 7 bits per byte, high bit means "more bytes follow". */
function readUIntBase128(bytes: Uint8Array, offset: number): [value: number, next: number] {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = bytes[offset + i];
    if (byte === undefined) throw new Error("Truncated UIntBase128");
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return [value, offset + i + 1];
  }
  throw new Error("UIntBase128 longer than 5 bytes");
}

export function readWoff2Metrics(file: Uint8Array): FontMetrics {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint32(0) !== 0x774f4632) throw new Error("Not a WOFF2 file (missing 'wOF2' signature)");
  const numTables = view.getUint16(12);
  const totalCompressedSize = view.getUint32(20);

  // Table directory: which tables exist, in stream order, and how long each is.
  const tables: Array<{ tag: string; length: number }> = [];
  let offset = 48;
  for (let i = 0; i < numTables; i++) {
    const flags = file[offset++]!;
    let tag: string;
    if ((flags & 0x3f) === 0x3f) {
      tag = String.fromCharCode(...file.subarray(offset, offset + 4));
      offset += 4;
    } else {
      tag = KNOWN_TAGS[flags & 0x3f] ?? `#${flags & 0x3f}`;
    }
    const [origLength, afterOrig] = readUIntBase128(file, offset);
    offset = afterOrig;
    // glyf/loca are transformed when the version is 0; every other table when it isn't.
    const version = flags >> 6;
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    let length = origLength;
    if (transformed) {
      [length, offset] = readUIntBase128(file, offset);
    }
    tables.push({ tag, length });
  }

  const stream = brotliDecompressSync(file.subarray(offset, offset + totalCompressedSize));
  const locate = (tag: string): DataView => {
    let start = 0;
    for (const table of tables) {
      if (table.tag === tag) return new DataView(stream.buffer, stream.byteOffset + start, table.length);
      start += table.length;
    }
    throw new Error(`Font has no ${tag} table`);
  };

  const head = locate("head");
  const hhea = locate("hhea");
  const os2 = locate("OS/2");
  return {
    unitsPerEm: head.getUint16(18),
    ascender: hhea.getInt16(4),
    descender: hhea.getInt16(6),
    lineGap: hhea.getInt16(8),
    xAvgCharWidth: os2.getInt16(2),
  };
}

if (import.meta.main) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/font-metrics.ts <font.woff2>");
    process.exitCode = 1;
  } else {
    const metrics = readWoff2Metrics(await readFile(path));
    const em = (units: number) => (units / metrics.unitsPerEm).toFixed(4);
    console.log({ ...metrics, ascenderEm: em(metrics.ascender), descenderEm: em(metrics.descender), lineGapEm: em(metrics.lineGap) });
  }
}
