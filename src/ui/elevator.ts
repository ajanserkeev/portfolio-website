import { clamp } from '../engine/math';

export function activeLevelIndex(position: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round(Number.isFinite(position) ? position : 0), 0, total - 1);
}

/** Dial needle angle: -sweep/2 at the roof, +sweep/2 at the basement. */
export function needleAngleDeg(position: number, total: number, sweepDeg = 180): number {
  return -sweepDeg / 2 + liftProgress(position, total) * sweepDeg;
}

/** Lift position as a 0..1 fraction of the shaft: 0 at the roof, 1 at the basement. */
export function liftProgress(position: number, total: number): number {
  const span = Math.max(1, total - 1);
  return clamp(Number.isFinite(position) ? position : 0, 0, span) / span;
}
