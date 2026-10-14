import { median, sampleFrameIntervals } from './fps-probe';
import type { RenderLoop } from './loop';
import { adjustTierByFps, type Tier } from './tiers';

export interface TierProbeDeps {
  loop: Pick<RenderLoop, 'setContinuous'>;
  tier(): Exclude<Tier, 'static'>;
  /** Switch to a lower live tier (pixel ratio, data-tier, bus event). */
  apply(tier: Exclude<Tier, 'static'>): void;
  /** Too slow even for lite: the page goes static. */
  fallback(): void;
  stopped(): boolean;
}

/** Measures frame times after the first frame and steps the tier down, at most twice. */
export async function probeTier(deps: TierProbeDeps): Promise<void> {
  for (let attempt = 0; attempt < 2 && !deps.stopped(); attempt += 1) {
    deps.loop.setContinuous('probe', true);
    const intervals = await sampleFrameIntervals(60);
    deps.loop.setContinuous('probe', false);
    if (deps.stopped()) return;
    const next = adjustTierByFps(deps.tier(), median(intervals));
    if (next === deps.tier()) return;
    if (next === 'static') {
      deps.fallback();
      return;
    }
    deps.apply(next);
  }
}
