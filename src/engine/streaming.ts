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

function within(index: number, range: { from: number; to: number }): boolean {
  return index >= range.from && index <= range.to;
}

/**
 * Levels within ±radius of any position are loaded; ready levels beyond ±(radius + 1) of every
 * position are disposed. Pass the camera and the scroll goal together so a far jump prefetches
 * the destination without dropping what the camera is still looking at.
 */
export function planStreaming(
  statuses: readonly LevelStatus[],
  position: number | readonly number[],
  radius = 1,
): StreamingPlan {
  const total = statuses.length;
  const positions = (typeof position === 'number' ? [position] : [...position]).map((p) =>
    clamp(Number.isFinite(p) ? p : 0, 0, Math.max(0, total - 1)),
  );
  const keeps = positions.map((p) => keepWindow(p, total, radius));
  const evicts = positions.map((p) => keepWindow(p, total, radius + 1));
  const load: number[] = [];
  const dispose: number[] = [];
  statuses.forEach((status, index) => {
    if (status === 'absent' && keeps.some((range) => within(index, range))) load.push(index);
    if (status === 'ready' && !evicts.some((range) => within(index, range))) dispose.push(index);
  });
  const distance = (index: number) => Math.min(...positions.map((p) => Math.abs(index - p)));
  load.sort((a, b) => distance(a) - distance(b));
  return { load, dispose };
}
