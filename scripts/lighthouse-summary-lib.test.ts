import { describe, expect, it } from 'vitest';
import { summarizeLighthouse } from './lighthouse-summary-lib';

const lhr = (perf: number, lcp: number, tbt: number) => ({
  requestedUrl: 'http://localhost:4322/',
  categories: { performance: { score: perf } },
  audits: {
    'largest-contentful-paint': { numericValue: lcp },
    'total-blocking-time': { numericValue: tbt },
    'first-contentful-paint': { numericValue: 900 },
    'cumulative-layout-shift': { numericValue: 0.01 },
    'mainthread-work-breakdown': {
      details: {
        items: [
          { groupLabel: 'Script Evaluation', duration: 2100.4 },
          { groupLabel: 'Style & Layout', duration: 800 },
        ],
      },
    },
    'bootup-time': {
      details: { items: [{ url: 'http://localhost:4322/_astro/app.abc.js', total: 1900.7 }] },
    },
  },
});

describe('summarizeLighthouse', () => {
  it('reports the median run per URL with the biggest costs, as GitHub notices', () => {
    const lines = summarizeLighthouse([
      lhr(0.7, 2300, 1700),
      lhr(0.8, 2000, 900),
      lhr(0.6, 2500, 2000),
    ]);
    expect(lines[0]).toBe(
      '::notice title=Lighthouse http://localhost:4322/::performance 0.70 · FCP 900 ms · LCP 2300 ms · TBT 1700 ms · CLS 0.010',
    );
    expect(lines[1]).toContain('Script Evaluation 2100 ms');
    expect(lines[1]).toContain('_astro/app.abc.js 1901 ms');
  });

  it('says so when there are no reports', () => {
    expect(summarizeLighthouse([])).toEqual(['::warning title=Lighthouse::no reports found']);
  });
});
