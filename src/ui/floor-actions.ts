import type { LevelId } from '../engine/config';

/** The main interactive of each floor: the `extras.action` of its `hit__*` box and of its DOM twin. */
export const FLOOR_ACTIONS = {
  roof: 'toggle-agent',
  agents: 'open-chat',
  crm: 'run-deal',
  booking: 'open-booking',
  workshop: 'next-stage',
  basement: 'test-capsule',
} as const satisfies Record<LevelId, string>;

export type FloorAction = (typeof FLOOR_ACTIONS)[LevelId];

/** Actions that only animate the 3D scene; their buttons hide in static mode. */
export const NEEDS_3D: ReadonlySet<FloorAction> = new Set<FloorAction>([
  'toggle-agent',
  'run-deal',
  'next-stage',
  'test-capsule',
]);
