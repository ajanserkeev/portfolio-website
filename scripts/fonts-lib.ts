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
