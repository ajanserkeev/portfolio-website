import raw from '../../scene/tower.json';

export const LEVEL_IDS = ['roof', 'agents', 'crm', 'booking', 'workshop', 'basement'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];
export type LevelKind = 'roof' | 'floor' | 'basement';

export interface FrameRule {
  /** Share of the screen width the level should occupy. */
  fitWidth: number;
  /** Where the level centre lands on screen, as a fraction of width/height. */
  centerX: number;
  centerY: number;
  /** Landscape only: world-space height that must stay visible. */
  minVisibleHeight?: number;
}

export interface CameraConfig {
  fovDeg: number;
  pitchDeg: number;
  yawDeg: number;
  targetHeight: number;
  travelBulge: number;
  portrait: FrameRule;
  landscape: FrameRule;
}

export interface TowerConfig {
  version: 1;
  level: { width: number; depth: number; height: number; slab: number };
  levels: ReadonlyArray<{ id: LevelId; kind: LevelKind }>;
  camera: CameraConfig;
  tube: { x: number; z: number; radius: number };
  /** Lift shaft footprint (front-left corner of every floor): x/z centre, width along x, depth along z. */
  shaft: { x: number; z: number; width: number; depth: number };
}

/** Shape is validated by config.test.ts; the cast is safe while that test passes. */
export const tower = raw as TowerConfig;

export function levelIndex(id: LevelId, cfg: TowerConfig = tower): number {
  const index = cfg.levels.findIndex((level) => level.id === id);
  if (index < 0) throw new Error(`Unknown level: ${id}`);
  return index;
}

/** Y of the floor surface of level `index` (0 = roof deck). */
export function levelBaseY(index: number, cfg: TowerConfig = tower): number {
  return 0 - index * cfg.level.height;
}
