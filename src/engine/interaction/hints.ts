import { Box3, type Camera, type Object3D, Vector3 } from 'three';
import type { TowerEventOf } from '../events';

export type HintEvent = TowerEventOf<'hint:moved'>;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const bounds = new Box3();
const point = new Vector3();

/**
 * CSS-pixel point of `object` on a canvas at `rect` (the top centre of its bounding box, or the
 * middle with `at: 'centre'`); null when it is outside the camera's depth range.
 */
export function projectHint(
  object: Object3D,
  camera: Camera,
  rect: Rect,
  at: 'top' | 'centre' = 'top',
): { x: number; y: number } | null {
  bounds.setFromObject(object);
  if (bounds.isEmpty()) return null;
  bounds.getCenter(point);
  if (at === 'top') point.y = bounds.max.y;
  point.project(camera);
  if (point.z < -1 || point.z > 1) return null;
  return {
    x: rect.left + ((point.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - point.y) / 2) * rect.height,
  };
}

/** Emits `hint:moved` only when the chip would visibly change: whole pixels, floor, visibility. */
export function createHintEmitter(
  emit: (event: HintEvent) => void,
): (next: Omit<HintEvent, 'type'>) => void {
  let last: string | null = null;
  return (next) => {
    const x = Math.round(next.x);
    const y = Math.round(next.y);
    const key = next.visible ? `${next.level}|${next.action}|${x}|${y}` : 'hidden';
    if (key === last) return;
    last = key;
    emit({ type: 'hint:moved', ...next, x, y });
  };
}
