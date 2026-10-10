import type { TowerConfig } from './config';
import type { Framing } from './framing';
import { clamp } from './math';

export type Vec3 = readonly [number, number, number];

export interface Pose {
  position: Vec3;
  target: Vec3;
}

/** Camera pose for a lift position: looks at the level centre, pulls back mid-travel. */
export function cameraPose(liftPos: number, framing: Framing, cfg: TowerConfig): Pose {
  const last = cfg.levels.length - 1;
  const p = clamp(Number.isFinite(liftPos) ? liftPos : 0, 0, last);
  const phase = p - Math.floor(p);
  const distance = framing.distance * (1 + cfg.camera.travelBulge * Math.sin(Math.PI * phase));
  const pitch = (cfg.camera.pitchDeg * Math.PI) / 180;
  const yaw = (cfg.camera.yawDeg * Math.PI) / 180;
  const targetY = cfg.camera.targetHeight - p * cfg.level.height;
  return {
    target: [0, targetY, 0],
    position: [
      Math.sin(yaw) * Math.cos(pitch) * distance,
      targetY + Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance,
    ],
  };
}
