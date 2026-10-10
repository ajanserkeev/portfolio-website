import { describe, expect, it } from 'vitest';
import {
  adjustTierByFps,
  decideTier,
  motionPolicy,
  parseTierOverride,
  pixelRatioFor,
  type TierSignals,
} from './tiers';

const capable: TierSignals = {
  webgl2: true,
  saveData: false,
  deviceMemoryGb: 8,
  gpu: 'Apple GPU',
  override: null,
};

describe('decideTier', () => {
  it('gives a capable device the high tier', () => {
    expect(decideTier(capable)).toBe('high');
  });

  it('goes static without WebGL2, even if 3D is forced', () => {
    expect(decideTier({ ...capable, webgl2: false })).toBe('static');
    expect(decideTier({ ...capable, webgl2: false, override: 'high' })).toBe('static');
  });

  it('honours a forced tier when WebGL2 exists', () => {
    expect(decideTier({ ...capable, override: 'lite' })).toBe('lite');
    expect(decideTier({ ...capable, override: 'static' })).toBe('static');
    expect(decideTier({ ...capable, saveData: true, override: 'high' })).toBe('high');
  });

  it('respects Save-Data', () => {
    expect(decideTier({ ...capable, saveData: true })).toBe('static');
  });

  it('goes static on software renderers', () => {
    expect(decideTier({ ...capable, gpu: 'ANGLE (Google, SwiftShader Device)' })).toBe('static');
    expect(decideTier({ ...capable, gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).toBe('static');
  });

  it('goes static with 1 GB of memory and lite with 2 GB', () => {
    expect(decideTier({ ...capable, deviceMemoryGb: 1 })).toBe('static');
    expect(decideTier({ ...capable, deviceMemoryGb: 2 })).toBe('lite');
  });

  it('gives old mobile GPUs the lite tier', () => {
    expect(decideTier({ ...capable, gpu: 'Mali-T830' })).toBe('lite');
    expect(decideTier({ ...capable, gpu: 'Adreno (TM) 405' })).toBe('lite');
  });

  it('treats unknown memory and GPU as capable', () => {
    expect(decideTier({ ...capable, deviceMemoryGb: null, gpu: null })).toBe('high');
  });
});

describe('adjustTierByFps', () => {
  it('keeps high when frames are fast', () => {
    expect(adjustTierByFps('high', 16.7)).toBe('high');
  });

  it('drops high to lite below ~45 fps', () => {
    expect(adjustTierByFps('high', 30)).toBe('lite');
  });

  it('drops lite to static below ~25 fps', () => {
    expect(adjustTierByFps('lite', 35)).toBe('lite');
    expect(adjustTierByFps('lite', 50)).toBe('static');
  });

  it('ignores invalid measurements', () => {
    expect(adjustTierByFps('high', Number.NaN)).toBe('high');
  });
});

describe('pixelRatioFor', () => {
  it('caps high at 2', () => {
    expect(pixelRatioFor('high', 3)).toBe(2);
    expect(pixelRatioFor('high', 1.5)).toBe(1.5);
  });

  it('uses 1 for lite', () => {
    expect(pixelRatioFor('lite', 3)).toBe(1);
  });

  it('falls back to 1 for invalid ratios', () => {
    expect(pixelRatioFor('high', Number.NaN)).toBe(1);
    expect(pixelRatioFor('high', 0)).toBe(1);
  });
});

describe('parseTierOverride', () => {
  it('reads ?tier= from the query string', () => {
    expect(parseTierOverride('?tier=lite')).toBe('lite');
    expect(parseTierOverride('?debug=1&tier=static')).toBe('static');
  });

  it('ignores unknown values', () => {
    expect(parseTierOverride('?tier=ultra')).toBeNull();
    expect(parseTierOverride('')).toBeNull();
  });
});

describe('motionPolicy', () => {
  it('cuts the camera and stops ambient loops for reduced motion', () => {
    expect(motionPolicy(true)).toEqual({ camera: 'cut', ambient: false });
    expect(motionPolicy(false)).toEqual({ camera: 'smooth', ambient: true });
  });
});
