import { describe, expect, it } from 'vitest';
import { fontFaceCss, fontFileName, parseGoogleFontsCss } from './fonts-lib';

const face = (subset: string, url: string, range: string) => `/* ${subset} */
@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(${url}) format('woff2');
  unicode-range: ${range};
}
`;

const css =
  face('cyrillic-ext', 'https://f/ext.woff2', 'U+0460-052F') +
  face('cyrillic', 'https://f/cyr.woff2', 'U+0301, U+0400-045F') +
  face('latin-ext', 'https://f/latext.woff2', 'U+0100-02BA') +
  face('latin', 'https://f/lat.woff2', 'U+0000-00FF');

describe('parseGoogleFontsCss', () => {
  it('labels each face with the subset comment that precedes it', () => {
    expect(parseGoogleFontsCss(css)).toEqual([
      {
        family: 'Manrope',
        weight: '400',
        subset: 'cyrillic',
        url: 'https://f/cyr.woff2',
        unicodeRange: 'U+0301, U+0400-045F',
      },
      {
        family: 'Manrope',
        weight: '400',
        subset: 'latin',
        url: 'https://f/lat.woff2',
        unicodeRange: 'U+0000-00FF',
      },
    ]);
  });

  it('names files by family, weight and subset', () => {
    const [cyr] = parseGoogleFontsCss(css);
    expect(cyr && fontFileName(cyr)).toBe('manrope-400-cyrillic.woff2');
  });

  it('keeps a variable weight range as one face', () => {
    const variable = face('latin', 'https://f/var.woff2', 'U+0000-00FF').replace(
      'font-weight: 400;',
      'font-weight: 400 700;',
    );
    const [only] = parseGoogleFontsCss(variable);
    expect(only?.weight).toBe('400 700');
    expect(only && fontFileName(only)).toBe('manrope-400-700-latin.woff2');
    expect(only && fontFaceCss(only)).toContain('font-weight: 400 700;');
  });

  it('writes the unicode-range from the source CSS', () => {
    const [cyr] = parseGoogleFontsCss(css);
    expect(cyr && fontFaceCss(cyr)).toContain('unicode-range: U+0301, U+0400-045F;');
  });
});
