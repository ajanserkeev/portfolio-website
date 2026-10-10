import { smoothstep } from './math';

/** Scroll range (document px) during which the lift moves from level k to level k + 1. */
export interface Travel {
  start: number;
  end: number;
}

/** Makes travels sequential: none starts before the previous one ends, none has negative length. */
export function normalizeTravels(travels: readonly Travel[]): Travel[] {
  const result: Travel[] = [];
  let cursor = Number.NEGATIVE_INFINITY;
  for (const travel of travels) {
    const start = Math.max(travel.start, cursor);
    const end = Math.max(travel.end, start);
    result.push({ start, end });
    cursor = end;
  }
  return result;
}

/**
 * Lift position for a document scroll offset, in [0, travels.length].
 * Integer values mean "standing at a level"; fractions mean "between levels".
 * Expects normalized travels (see normalizeTravels).
 */
export function liftPosition(scrollY: number, travels: readonly Travel[]): number {
  if (!Number.isFinite(scrollY)) return 0;
  for (let k = 0; k < travels.length; k += 1) {
    const travel = travels[k];
    if (travel === undefined || scrollY >= travel.end) continue;
    if (scrollY <= travel.start) return k;
    return k + smoothstep((scrollY - travel.start) / (travel.end - travel.start));
  }
  return travels.length;
}
