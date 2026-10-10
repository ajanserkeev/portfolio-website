export type Tier = 'high' | 'lite' | 'static';

export interface TierSignals {
  webgl2: boolean;
  saveData: boolean;
  /** navigator.deviceMemory (Chromium only), null when unknown. */
  deviceMemoryGb: number | null;
  /** WebGL renderer string, null when unknown. */
  gpu: string | null;
  /** ?tier= or the visitor's stored choice. */
  override: Tier | null;
}

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|basic render driver/i;
const OLD_MOBILE_GPU = /mali-4\d\d|mali-t\d+|adreno \(tm\) [2-4]\d\d|powervr sgx/i;

export function decideTier(signals: TierSignals): Tier {
  if (signals.override === 'static' || !signals.webgl2) return 'static';
  if (signals.override) return signals.override;
  if (signals.saveData) return 'static';
  if (signals.gpu && SOFTWARE_GPU.test(signals.gpu)) return 'static';
  if (signals.deviceMemoryGb !== null && signals.deviceMemoryGb <= 1) return 'static';
  if (signals.gpu && OLD_MOBILE_GPU.test(signals.gpu)) return 'lite';
  if (signals.deviceMemoryGb !== null && signals.deviceMemoryGb <= 2) return 'lite';
  return 'high';
}

/** Downgrades the tier when the measured median frame time is too slow. */
export function adjustTierByFps(tier: Tier, medianFrameMs: number): Tier {
  if (!Number.isFinite(medianFrameMs)) return tier;
  if (tier === 'high' && medianFrameMs > 22) return 'lite';
  if (tier === 'lite' && medianFrameMs > 40) return 'static';
  return tier;
}

export function pixelRatioFor(tier: Tier, devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return tier === 'high' ? Math.min(dpr, 2) : 1;
}

export function parseTierOverride(search: string): Tier | null {
  const value = new URLSearchParams(search).get('tier');
  return value === 'high' || value === 'lite' || value === 'static' ? value : null;
}

export interface MotionPolicy {
  camera: 'smooth' | 'cut';
  ambient: boolean;
}

export function motionPolicy(prefersReducedMotion: boolean): MotionPolicy {
  return prefersReducedMotion
    ? { camera: 'cut', ambient: false }
    : { camera: 'smooth', ambient: true };
}
