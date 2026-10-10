import { describe, expect, it } from 'vitest';
import { defaultPricingTable } from '../data/pricing';
import { type EstimateSelection, estimate } from './estimate';

describe('estimate()', () => {
  it('returns zeros when no services and no pain are selected', () => {
    const selection: EstimateSelection = {
      services: [],
    };

    const result = estimate(selection, defaultPricingTable);
    expect(result.minPriceUsd).toBe(0);
    expect(result.maxPriceUsd).toBe(0);
    expect(result.minDays).toBe(0);
    expect(result.maxDays).toBe(0);
  });

  it('uses default services from pain when services array is empty', () => {
    const selection: EstimateSelection = {
      pain: 'lost-leads', // defaults to ['agents', 'crm']
      services: [],
    };

    const result = estimate(selection, defaultPricingTable);
    // agents: 1500-3500, crm: 1800-4000 -> 3300-7500
    expect(result.minPriceUsd).toBe(3300);
    expect(result.maxPriceUsd).toBe(7500);
    expect(result.minDays).toBeGreaterThan(0);
    expect(result.maxDays).toBeGreaterThan(0);
    expect(result.resolvedServices).toEqual(['agents', 'crm']);
  });

  it('calculates single service standard medium complexity', () => {
    const selection: EstimateSelection = {
      services: ['booking'],
      complexity: 'medium',
      urgency: 'standard',
    };

    const result = estimate(selection, defaultPricingTable);
    // booking: 1200 - 2800, 5 - 14 days
    expect(result.minPriceUsd).toBe(1200);
    expect(result.maxPriceUsd).toBe(2800);
    expect(result.minDays).toBe(5);
    expect(result.maxDays).toBe(14);
  });

  it('applies complexity multiplier correctly', () => {
    const simpleSel: EstimateSelection = {
      services: ['web'], // 2000 - 5000
      complexity: 'simple', // 0.85
    };
    const simpleRes = estimate(simpleSel, defaultPricingTable);
    expect(simpleRes.minPriceUsd).toBe(Math.round(2000 * 0.85));
    expect(simpleRes.maxPriceUsd).toBe(Math.round(5000 * 0.85));

    const entSel: EstimateSelection = {
      services: ['web'],
      complexity: 'enterprise', // 1.6
    };
    const entRes = estimate(entSel, defaultPricingTable);
    expect(entRes.minPriceUsd).toBe(Math.round(2000 * 1.6));
    expect(entRes.maxPriceUsd).toBe(Math.round(5000 * 1.6));
  });

  it('applies urgency multipliers to price and timeline', () => {
    const urgentSel: EstimateSelection = {
      services: ['agents'], // 1500 - 3500, 7 - 21 days
      urgency: 'urgent', // price * 1.3, days * 0.65
    };

    const res = estimate(urgentSel, defaultPricingTable);
    expect(res.minPriceUsd).toBe(Math.round(1500 * 1.3));
    expect(res.maxPriceUsd).toBe(Math.round(3500 * 1.3));
    expect(res.minDays).toBe(Math.round(7 * 0.65));
    expect(res.maxDays).toBe(Math.round(21 * 0.65));
  });

  it('adds support months to total price', () => {
    const sel: EstimateSelection = {
      services: ['booking'],
      supportMonths: 3, // 3 * 300 = 900
    };

    const res = estimate(sel, defaultPricingTable);
    expect(res.minPriceUsd).toBe(1200 + 900);
    expect(res.maxPriceUsd).toBe(2800 + 900);
  });

  it('combines multiple services with parallel timeline discount', () => {
    const sel: EstimateSelection = {
      services: ['agents', 'crm', 'web'],
    };

    const res = estimate(sel, defaultPricingTable);
    // Sum of base prices: 1500+1800+2000 = 5300, 3500+4000+5000 = 12500
    expect(res.minPriceUsd).toBe(5300);
    expect(res.maxPriceUsd).toBe(12500);

    // Days should be less than naive sum (7+10+14=31) due to parallelism
    expect(res.minDays).toBeLessThan(31);
    expect(res.maxDays).toBeLessThan(21 + 28 + 35);
  });
});
