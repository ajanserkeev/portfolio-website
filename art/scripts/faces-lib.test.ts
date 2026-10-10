import { describe, expect, it } from 'vitest';
import { FACE_FRAMES } from '../../src/engine/actors/faces';
import { facePixels, faceSvg } from './faces-lib';

describe('robot faces', () => {
  it('draws every frame inside the 16x16 grid', () => {
    for (const frame of FACE_FRAMES) {
      const pixels = facePixels(frame);
      expect(pixels.length).toBeGreaterThan(0);
      for (const [x, y] of pixels) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(16);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(16);
      }
    }
  });

  it('makes blink different from neutral', () => {
    expect(facePixels('blink')).not.toEqual(facePixels('neutral'));
  });

  it('renders one rect per lit pixel plus the screen background', () => {
    const rects = faceSvg('happy').match(/<rect /g) ?? [];
    expect(rects).toHaveLength(facePixels('happy').length + 1);
  });
});
