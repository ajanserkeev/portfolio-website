import { brotliDecompressSync } from 'node:zlib';

export interface FontSource {
  family: string;
  weight: string;
  subset: 'latin' | 'cyrillic';
  url: string;
  unicodeRange: string;
}

const WANTED = new Set(['latin', 'cyrillic']);
// Google Fonts puts the subset comment *before* each @font-face block.
const FACE = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;

export function parseGoogleFontsCss(css: string): FontSource[] {
  const faces: FontSource[] = [];
  for (const [, subset, body = ''] of css.matchAll(FACE)) {
    if (!subset || !WANTED.has(subset)) continue;
    const family = body.match(/font-family:\s*['"]?([^'";]+)['"]?;/)?.[1]?.trim();
    const weight = body.match(/font-weight:\s*(\d+(?:\s+\d+)?);/)?.[1];
    const url = body.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (family && weight && url && unicodeRange) {
      faces.push({ family, weight, subset: subset as FontSource['subset'], url, unicodeRange });
    }
  }
  return faces;
}

export function fontFileName(f: FontSource): string {
  const slug = (text: string) => text.toLowerCase().replace(/\s+/g, '-');
  return `${slug(f.family)}-${slug(f.weight)}-${f.subset}.woff2`;
}

export function fontFaceCss(f: FontSource): string {
  return `@font-face {
  font-family: "${f.family}";
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url("/fonts/${fontFileName(f)}") format("woff2");
  unicode-range: ${f.unicodeRange};
}
`;
}

export interface FontMetrics {
  unitsPerEm: number;
  /** hhea ascender/descender/lineGap, in font units (descender is negative). */
  ascender: number;
  descender: number;
  lineGap: number;
}

// WOFF2 table directory: a 6-bit index into the spec's list of known tags (only the ones we read).
const TAG_HEAD = 1;
const TAG_HHEA = 2;
const TAG_GLYF = 10;
const TAG_LOCA = 11;
const TAG_ARBITRARY = 63;
const HEADER_BYTES = 48;

/** Reads a font's vertical metrics from a WOFF2 file (https://www.w3.org/TR/WOFF2/). */
export function readWoff2Metrics(file: Uint8Array): FontMetrics {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (file.byteLength < HEADER_BYTES || view.getUint32(0) !== 0x774f4632) {
    throw new Error('not a WOFF2 file');
  }
  const numTables = view.getUint16(12);
  const compressedSize = view.getUint32(20);
  let at = HEADER_BYTES;
  const base128 = () => {
    let result = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = view.getUint8(at);
      at += 1;
      result = result * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return result;
    }
    throw new Error('bad UIntBase128 in WOFF2 table directory');
  };
  const offsets = new Map<number, number>();
  let offset = 0;
  for (let i = 0; i < numTables; i += 1) {
    const flags = view.getUint8(at);
    at += 1;
    const tag = flags & 0x3f;
    const transform = flags >> 6;
    if (tag === TAG_ARBITRARY) at += 4;
    const origLength = base128();
    const glyfOrLoca = tag === TAG_GLYF || tag === TAG_LOCA;
    const transformed = glyfOrLoca ? transform !== 3 : transform !== 0;
    const length = transformed ? base128() : origLength;
    offsets.set(tag, offset);
    offset += length;
  }
  // The tables follow the directory as one Brotli stream, back to back.
  const tables = brotliDecompressSync(file.subarray(at, at + compressedSize));
  const data = new DataView(tables.buffer, tables.byteOffset, tables.byteLength);
  const head = offsets.get(TAG_HEAD);
  const hhea = offsets.get(TAG_HHEA);
  if (head === undefined || hhea === undefined) throw new Error('WOFF2 file has no head/hhea');
  return {
    unitsPerEm: data.getUint16(head + 18),
    ascender: data.getInt16(hhea + 4),
    descender: data.getInt16(hhea + 6),
    lineGap: data.getInt16(hhea + 8),
  };
}

export interface FallbackOptions {
  /** Web font width ÷ Arial width for the same text, measured in a browser. */
  sizeAdjust: number;
  /** Stand in with Arial Bold (for a bold-only web font such as Unbounded 700). */
  bold?: boolean;
  unicodeRange?: string;
}

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

/**
 * `"<family> Fallback"`: local Arial (Liberation Sans on Linux, Helvetica on Apple) scaled to the
 * web font's width and given its line metrics, so the swap to the web font does not move the text.
 */
export function fallbackFaceCss(
  family: string,
  font: FontMetrics,
  options: FallbackOptions,
): string {
  const share = (units: number) => percent(Math.abs(units) / font.unitsPerEm / options.sizeAdjust);
  const local = options.bold
    ? 'local("Arial Bold"), local("Arial-BoldMT"), local("Liberation Sans Bold"), local("Helvetica Bold")'
    : 'local("Arial"), local("ArialMT"), local("Liberation Sans"), local("Helvetica")';
  const lines = [
    `font-family: "${family} Fallback";`,
    `src: ${local};`,
    ...(options.bold ? ['font-weight: 700;'] : []),
    `size-adjust: ${percent(options.sizeAdjust)};`,
    `ascent-override: ${share(font.ascender)};`,
    `descent-override: ${share(font.descender)};`,
    `line-gap-override: ${share(font.lineGap)};`,
    ...(options.unicodeRange ? [`unicode-range: ${options.unicodeRange};`] : []),
  ];
  return `@font-face {\n${lines.map((line) => `  ${line}`).join('\n')}\n}\n`;
}
