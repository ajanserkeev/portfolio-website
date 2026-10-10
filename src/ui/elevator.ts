import { clamp } from '../engine/math';

export function activeLevelIndex(position: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round(Number.isFinite(position) ? position : 0), 0, total - 1);
}

/** Dial needle angle: -sweep/2 at the roof, +sweep/2 at the basement. */
export function needleAngleDeg(position: number, total: number, sweepDeg = 180): number {
  const span = Math.max(1, total - 1);
  const t = clamp(Number.isFinite(position) ? position : 0, 0, span) / span;
  return -sweepDeg / 2 + t * sweepDeg;
}
