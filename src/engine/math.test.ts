import { describe, expect, it } from 'vitest';
import { clamp, damp, smoothstep } from './math';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('damp', () => {
  it('does not move without time', () => {
    expect(damp(0, 10, 6, 0)).toBe(0);
  });

  it('approaches the target over time', () => {
    expect(damp(0, 10, 6, 2)).toBeGreaterThan(9.99);
  });

  it('is frame-rate independent', () => {
    const twoHalfSteps = damp(damp(0, 10, 6, 0.008), 10, 6, 0.008);
    expect(twoHalfSteps).toBeCloseTo(damp(0, 10, 6, 0.016), 12);
  });
});

describe('smoothstep', () => {
  it('maps the ends and the middle exactly', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
  });

  it('clamps outside [0, 1]', () => {
    expect(smoothstep(-2)).toBe(0);
    expect(smoothstep(3)).toBe(1);
  });
});
