import { describe, expect, it } from 'vitest';
import { createReactionTimer, createTapCounter } from './reactions';

describe('createReactionTimer', () => {
  it('runs for its length and reports the moment it ends', () => {
    const timer = createReactionTimer(2);
    expect(timer.trigger()).toBe(true);
    expect(timer.update(1.5)).toBe(false);
    expect(timer.active).toBe(true);
    expect(timer.update(0.6)).toBe(true);
    expect(timer.active).toBe(false);
    expect(timer.update(1)).toBe(false);
  });

  it('extends instead of stacking when triggered again', () => {
    const timer = createReactionTimer(2);
    timer.trigger();
    timer.update(1.5);
    expect(timer.trigger()).toBe(false);
    expect(timer.update(1.5)).toBe(false);
    expect(timer.update(0.6)).toBe(true);
  });

  it('reports progress from 0 to 1', () => {
    const timer = createReactionTimer(2);
    timer.trigger();
    timer.update(0.5);
    expect(timer.progress).toBeCloseTo(0.25);
  });
});

describe('createTapCounter', () => {
  it('counts taps in a row and starts over after a pause', () => {
    const taps = createTapCounter(4);
    expect([0, 1, 2, 3, 4].map((t) => taps.tap(t))).toEqual([1, 2, 3, 4, 5]);
    expect(taps.tap(8.5)).toBe(1);
  });
});
