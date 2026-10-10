import { describe, expect, it } from 'vitest';
import { median, sampleFrameIntervals } from './fps-probe';

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
});

describe('sampleFrameIntervals', () => {
  it('skips warm-up frames and returns the requested number of intervals', async () => {
    let time = 0;
    const queue: Array<(t: number) => void> = [];
    const request = (callback: (t: number) => void) => {
      queue.push(callback);
      return queue.length;
    };
    const promise = sampleFrameIntervals(5, 3, request);
    while (queue.length > 0) {
      time += 20;
      queue.shift()?.(time);
    }
    expect(await promise).toEqual([20, 20, 20, 20, 20]);
  });
});
