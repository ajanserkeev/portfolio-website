import { clamp } from './math';

export type LevelStatus = 'absent' | 'loading' | 'ready';

export interface StreamingPlan {
  load: number[];
  dispose: number[];
}

export function keepWindow(
  position: number,
  total: number,
  radius: number,
): { from: number; to: number } {
  const p = clamp(Number.isFinite(position) ? position : 0, 0, Math.max(0, total - 1));
  return {
    from: Math.max(0, Math.floor(p) - radius),
    to: Math.min(total - 1, Math.ceil(p) + radius),
  };
}

/** Levels within ±radius are loaded; ready levels beyond ±(radius + 1) are disposed. */
export function planStreaming(
  statuses: readonly LevelStatus[],
  position: number,
  radius = 1,
): StreamingPlan {
  const total = statuses.length;
  const keep = keepWindow(position, total, radius);
  const evict = keepWindow(position, total, radius + 1);
  const load: number[] = [];
  const dispose: number[] = [];
  statuses.forEach((status, index) => {
    if (status === 'absent' && index >= keep.from && index <= keep.to) load.push(index);
    if (status === 'ready' && (index < evict.from || index > evict.to)) dispose.push(index);
  });
  const centre = clamp(Number.isFinite(position) ? position : 0, 0, Math.max(0, total - 1));
  load.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
  return { load, dispose };
}
