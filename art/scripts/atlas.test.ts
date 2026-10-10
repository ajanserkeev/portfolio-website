import { describe, expect, it } from 'vitest';
import { packAtlas } from './atlas';

const first = { id: 'a', width: 512, height: 320 };
const items = [
  first,
  { id: 'b', width: 512, height: 640 },
  { id: 'c', width: 300, height: 600 },
  { id: 'd', width: 512, height: 320 },
  { id: 'e', width: 512, height: 320 },
];

describe('packAtlas', () => {
  const layout = packAtlas(items, 2048, 8);
  const rects = Object.entries(layout.rects);

  it('places every item inside the atlas with padding', () => {
    expect(rects).toHaveLength(items.length);
    for (const [, r] of rects) {
      expect(r.x).toBeGreaterThanOrEqual(8);
      expect(r.y).toBeGreaterThanOrEqual(8);
      expect(r.x + r.width).toBeLessThanOrEqual(layout.width - 8);
      expect(r.y + r.height).toBeLessThanOrEqual(layout.height - 8);
    }
  });

  it('never overlaps two items', () => {
    for (const [i, [, a]] of rects.entries()) {
      for (const [, b] of rects.slice(i + 1)) {
        const apart =
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('is deterministic', () => {
    expect(packAtlas([...items].reverse(), 2048, 8)).toEqual(layout);
  });

  it('rejects items wider than the atlas and duplicate ids', () => {
    expect(() => packAtlas([{ id: 'x', width: 4000, height: 10 }], 2048)).toThrow(/wider/);
    expect(() => packAtlas([first, first], 2048)).toThrow(/duplicate/);
  });
});
