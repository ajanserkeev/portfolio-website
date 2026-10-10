import { describe, expect, it } from 'vitest';
import { gridLuminanceDiff, type RawImage } from './compare-lib';

function solid(width: number, height: number, value: number): RawImage {
  return { data: new Uint8Array(width * height * 3).fill(value), width, height, channels: 3 };
}

describe('gridLuminanceDiff', () => {
  it('is zero for identical images', () => {
    expect(gridLuminanceDiff(solid(30, 30, 128), solid(30, 30, 128))).toEqual(Array(9).fill(0));
  });

  it('only reports the cell that changed', () => {
    const changed = solid(30, 30, 128);
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) changed.data.fill(0, (y * 30 + x) * 3, (y * 30 + x) * 3 + 3);
    }
    const diffs = gridLuminanceDiff(solid(30, 30, 128), changed);
    expect(diffs[0]).toBeGreaterThan(0.4);
    expect(diffs.slice(1).every((d) => d === 0)).toBe(true);
  });

  it('refuses images of different sizes', () => {
    expect(() => gridLuminanceDiff(solid(30, 30, 0), solid(20, 30, 0))).toThrow(/size/);
  });
});
