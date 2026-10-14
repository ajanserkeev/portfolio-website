import type { LevelId } from '../config';
import type { TowerEvent } from '../events';

/** How close (in floors) the lift must be to count as standing at a floor. */
const STOP_EPSILON = 0.01;
/** How close it must come for the floor to be announced while passing (analytics, panel). */
const REACH_EPSILON = 0.05;

/**
 * Reports a floor index once when the lift *stops* there (settled on a whole floor). Floors the
 * lift only passes through are not arrivals; leaving and coming back is a new one.
 */
export function createArrivalTracker(): {
  update(position: number, settled: boolean): number | null;
} {
  let standingAt: number | null = null;
  return {
    update(position, settled) {
      const nearest = Math.round(position);
      const atFloor = Math.abs(position - nearest) < STOP_EPSILON;
      if (standingAt !== null && Math.abs(position - standingAt) >= STOP_EPSILON) standingAt = null;
      if (!atFloor || !settled || standingAt === nearest) return null;
      standingAt = nearest;
      return nearest;
    },
  };
}

/** Names each floor once as the lift comes within reach of it, passing or stopping. */
export function createFloorAnnouncer(): { update(position: number): number | null } {
  let reached = -1;
  return {
    update(position) {
      const nearest = Math.round(position);
      if (nearest === reached || Math.abs(position - nearest) > REACH_EPSILON) return null;
      reached = nearest;
      return nearest;
    },
  };
}

/** Turns lift positions into `level:reached` (passing) and `lift:arrived` (stopped) events. */
export function createLiftAnnouncer(
  ids: readonly LevelId[],
  emit: (event: TowerEvent) => void,
): (position: number, settled: boolean) => void {
  const announcer = createFloorAnnouncer();
  const arrivals = createArrivalTracker();
  return (position, settled) => {
    const reached = ids[announcer.update(position) ?? -1];
    if (reached) emit({ type: 'level:reached', level: reached });
    const arrived = ids[arrivals.update(position, settled) ?? -1];
    if (arrived) emit({ type: 'lift:arrived', level: arrived });
  };
}
