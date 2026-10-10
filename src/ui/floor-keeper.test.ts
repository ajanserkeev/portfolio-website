import { describe, expect, it } from 'vitest';
import { floorAtLine } from './floor-keeper';

const sections = [
  { index: 0, top: 0, bottom: 1000 },
  { index: 1, top: 1000, bottom: 2500 },
  { index: 2, top: 2500, bottom: 4000 },
];

describe('floorAtLine', () => {
  it('returns the section that contains the line', () => {
    expect(floorAtLine(sections, 1200)).toBe(1);
    expect(floorAtLine(sections, 2500)).toBe(2);
  });

  it('clamps above the first and below the last section', () => {
    expect(floorAtLine(sections, -50)).toBe(0);
    expect(floorAtLine(sections, 9000)).toBe(2);
  });

  it('returns 0 when there are no sections', () => {
    expect(floorAtLine([], 100)).toBe(0);
  });
});
