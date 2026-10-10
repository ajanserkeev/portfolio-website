import { describe, expect, it } from 'vitest';
import { liftPosition, normalizeTravels } from './lift';

const travels = [
  { start: 100, end: 200 },
  { start: 400, end: 500 },
  { start: 700, end: 800 },
];

describe('liftPosition', () => {
  it('holds at the roof before the first travel', () => {
    expect(liftPosition(0, travels)).toBe(0);
    expect(liftPosition(100, travels)).toBe(0);
  });

  it('is halfway in the middle of a travel', () => {
    expect(liftPosition(150, travels)).toBeCloseTo(0.5, 10);
  });

  it('eases in: a quarter of the scroll covers less than a quarter of the way', () => {
    expect(liftPosition(125, travels)).toBeLessThan(0.25);
  });

  it('holds at the next level between travels', () => {
    expect(liftPosition(300, travels)).toBe(1);
  });

  it('reaches the last level after the last travel', () => {
    expect(liftPosition(10_000, travels)).toBe(3);
  });

  it('treats NaN scroll as the top', () => {
    expect(liftPosition(Number.NaN, travels)).toBe(0);
  });

  it('steps instantly over a zero-length travel', () => {
    const instant = [{ start: 100, end: 100 }];
    expect(liftPosition(99, instant)).toBe(0);
    expect(liftPosition(100, instant)).toBe(1);
  });

  it('returns 0 when there are no travels', () => {
    expect(liftPosition(500, [])).toBe(0);
  });

  it('never moves backwards while scrolling down', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (let y = -50; y <= 900; y += 7) {
      const position = liftPosition(y, travels);
      expect(position).toBeGreaterThanOrEqual(previous);
      previous = position;
    }
  });
});

describe('normalizeTravels', () => {
  it('keeps sequential travels unchanged', () => {
    expect(normalizeTravels(travels)).toEqual(travels);
  });

  it('pushes an overlapping travel after the previous one', () => {
    expect(
      normalizeTravels([
        { start: 0, end: 100 },
        { start: 50, end: 150 },
      ]),
    ).toEqual([
      { start: 0, end: 100 },
      { start: 100, end: 150 },
    ]);
  });

  it('turns a negative-length travel into a zero-length one', () => {
    expect(normalizeTravels([{ start: 100, end: 50 }])).toEqual([{ start: 100, end: 100 }]);
  });

  it('keeps the lift continuous after normalizing overlaps', () => {
    const fixed = normalizeTravels([
      { start: 0, end: 100 },
      { start: 50, end: 150 },
    ]);
    for (let y = 0; y < 160; y += 1) {
      expect(Math.abs(liftPosition(y + 1, fixed) - liftPosition(y, fixed))).toBeLessThan(0.05);
    }
  });
});
