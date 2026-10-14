import type { FaceFrame } from './faces';

export type RobotActivity = 'typing' | 'sorting' | 'idle';

export interface RobotPose {
  hover: number;
  headYaw: number;
  headPitch: number;
  armL: number;
  armR: number;
  face: FaceFrame;
}

export function parseActivity(value: unknown): RobotActivity {
  return value === 'typing' || value === 'sorting' ? value : 'idle';
}

/** Stable small number from a node name, so robots never move in sync. */
export function seedFrom(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 1000;
}

/** A tapped robot: a hop with both arms up, or (annoyed) a head shake on the spot. */
export function reactionPose(pose: RobotPose, progress: number, annoyed: boolean): RobotPose {
  const arc = Math.sin(Math.PI * progress);
  if (annoyed) {
    return {
      ...pose,
      headYaw: 0.35 * Math.sin(progress * Math.PI * 6),
      headPitch: 0.1,
      armL: -0.1,
      armR: -0.1,
      face: 'annoyed',
    };
  }
  return {
    ...pose,
    hover: pose.hover + 0.3 * arc,
    armL: -2.6 * arc,
    armR: -2.6 * arc,
    face: 'happy',
  };
}

export function robotPose(timeSec: number, seed: number, activity: RobotActivity): RobotPose {
  const t = timeSec + seed * 1.7;
  const hover = 0.04 * Math.sin(t * 1.6);
  const blinking = t % 4.2 < 0.12;
  switch (activity) {
    case 'typing':
      return {
        hover,
        headYaw: 0.15 * Math.sin(t * 0.4),
        headPitch: -0.12,
        armL: -0.9 + 0.15 * Math.sin(t * 14),
        armR: -0.9 + 0.15 * Math.sin(t * 14 + Math.PI),
        face: blinking ? 'blink' : 'focus',
      };
    case 'sorting':
      return {
        hover,
        headYaw: 0.5 * Math.sin(t * 0.9),
        headPitch: -0.2,
        armL: -0.3 - 0.6 * Math.max(0, Math.sin(t * 2.2)),
        armR: -0.3,
        face: blinking ? 'blink' : 'happy',
      };
    default:
      return {
        hover,
        headYaw: 0.25 * Math.sin(t * 0.5),
        headPitch: 0,
        armL: -0.1,
        armR: -0.1,
        face: blinking ? 'blink' : 'neutral',
      };
  }
}
