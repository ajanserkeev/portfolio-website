import { describe, expect, it } from 'vitest';
import type { CameraConfig } from './config';
import { tower } from './config';
import { apparentWidth, computeFraming } from './framing';

const camera: CameraConfig = {
  fovDeg: 30,
  pitchDeg: 14,
  yawDeg: 22,
  targetHeight: 1.5,
  travelBulge: 0.12,
  portrait: { fitWidth: 0.94, centerX: 0.5, centerY: 0.33 },
  landscape: { fitWidth: 0.55, centerX: 0.34, centerY: 0.5, minVisibleHeight: 5.4 },
};
const level = { width: 12, depth: 6 };
const tanHalf = Math.tan((30 * Math.PI) / 360);

describe('apparentWidth', () => {
  it('equals the width when looking straight on', () => {
    expect(apparentWidth(12, 6, 0)).toBeCloseTo(12, 10);
  });

  it('equals the depth when looking from the side', () => {
    expect(apparentWidth(12, 6, 90)).toBeCloseTo(6, 10);
  });
});

describe('computeFraming', () => {
  it('fits the level to the requested share of a portrait screen', () => {
    const viewport = { width: 390, height: 844 };
    const framing = computeFraming(viewport, camera, level);
    const visibleWidth = 2 * tanHalf * (390 / 844) * framing.distance;
    expect(framing.orientation).toBe('portrait');
    expect(apparentWidth(12, 6, 22) / visibleWidth).toBeCloseTo(0.94, 6);
  });

  it('keeps the minimum visible height in landscape', () => {
    const framing = computeFraming({ width: 1440, height: 900 }, camera, level);
    expect(framing.orientation).toBe('landscape');
    expect(2 * tanHalf * framing.distance).toBeGreaterThanOrEqual(5.4 - 1e-9);
  });

  it('never lets the level exceed its share of a landscape screen', () => {
    const framing = computeFraming({ width: 1440, height: 900 }, camera, level);
    const visibleWidth = 2 * tanHalf * (1440 / 900) * framing.distance;
    expect(apparentWidth(12, 6, 22) / visibleWidth).toBeLessThanOrEqual(0.55 + 1e-9);
  });

  it('shifts the frame so the level sits at the configured screen point', () => {
    const portrait = computeFraming({ width: 390, height: 844 }, camera, level);
    expect(portrait.viewOffsetX).toBeCloseTo(0, 10);
    expect(portrait.viewOffsetY).toBeCloseTo((0.5 - 0.33) * 844, 10);
    const landscape = computeFraming({ width: 1440, height: 900 }, camera, level);
    expect(landscape.viewOffsetX).toBeCloseTo((0.5 - 0.34) * 1440, 10);
  });

  it('returns finite numbers for an empty viewport', () => {
    const framing = computeFraming({ width: 0, height: 0 }, camera, level);
    expect(Number.isFinite(framing.distance)).toBe(true);
    expect(Number.isFinite(framing.viewOffsetX)).toBe(true);
  });

  it('works with the real tower config', () => {
    const framing = computeFraming({ width: 390, height: 844 }, tower.camera, tower.level);
    expect(framing.distance).toBeGreaterThan(0);
  });
});
