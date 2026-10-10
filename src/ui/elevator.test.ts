import { describe, expect, it } from 'vitest';
import { activeLevelIndex, needleAngleDeg } from './elevator';

describe('activeLevelIndex', () => {
  it('rounds to the nearest level', () => {
    expect(activeLevelIndex(1.4, 6)).toBe(1);
    expect(activeLevelIndex(1.6, 6)).toBe(2);
  });

  it('clamps and handles NaN', () => {
    expect(activeLevelIndex(-1, 6)).toBe(0);
    expect(activeLevelIndex(9, 6)).toBe(5);
    expect(activeLevelIndex(Number.NaN, 6)).toBe(0);
  });
});

describe('needleAngleDeg', () => {
  it('sweeps from -90 at the roof to +90 at the basement', () => {
    expect(needleAngleDeg(0, 6)).toBe(-90);
    expect(needleAngleDeg(2.5, 6)).toBe(0);
    expect(needleAngleDeg(5, 6)).toBe(90);
  });

  it('copes with a single level', () => {
    expect(needleAngleDeg(0, 1)).toBe(-90);
  });
});
