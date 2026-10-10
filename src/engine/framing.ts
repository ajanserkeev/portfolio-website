import type { CameraConfig } from './config';

export interface Viewport {
  width: number;
  height: number;
}

export interface Framing {
  /** Camera distance from the level target. */
  distance: number;
  /** Pixel offsets for PerspectiveCamera.setViewOffset (positive X moves the scene left, positive Y up). */
  viewOffsetX: number;
  viewOffsetY: number;
  orientation: 'portrait' | 'landscape';
}

/** Width of the level box seen by a camera rotated yawDeg around the vertical axis. */
export function apparentWidth(width: number, depth: number, yawDeg: number): number {
  const yaw = (yawDeg * Math.PI) / 180;
  return width * Math.abs(Math.cos(yaw)) + depth * Math.abs(Math.sin(yaw));
}

export function computeFraming(
  viewport: Viewport,
  camera: CameraConfig,
  level: { width: number; depth: number },
): Framing {
  const width = viewport.width > 0 ? viewport.width : 1;
  const height = viewport.height > 0 ? viewport.height : 1;
  const aspect = width / height;
  const orientation = aspect < 1 ? 'portrait' : 'landscape';
  const rule = camera[orientation];
  const tanHalf = Math.tan((camera.fovDeg * Math.PI) / 360);
  const visibleWidthAtUnitDistance = 2 * tanHalf * aspect;
  const fitByWidth =
    apparentWidth(level.width, level.depth, camera.yawDeg) /
    (rule.fitWidth * visibleWidthAtUnitDistance);
  const fitByHeight =
    rule.minVisibleHeight === undefined ? 0 : rule.minVisibleHeight / (2 * tanHalf);
  return {
    distance: Math.max(fitByWidth, fitByHeight),
    viewOffsetX: (0.5 - rule.centerX) * width,
    viewOffsetY: (0.5 - rule.centerY) * height,
    orientation,
  };
}
