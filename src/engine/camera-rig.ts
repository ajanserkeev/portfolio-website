import { PerspectiveCamera } from 'three';
import { cameraPose } from './camera-path';
import type { TowerConfig } from './config';
import { computeFraming, type Framing, type Viewport } from './framing';
import { damp } from './math';

const SETTLE_EPSILON = 1e-4;

/** Perspective camera that rides the lift: smooth by default, instant on request. */
export class CameraRig {
  readonly camera: PerspectiveCamera;
  private readonly cfg: TowerConfig;
  private readonly stiffness: number;
  private framing: Framing;
  private current = 0;
  private goal = 0;
  private centered = false;
  private viewport: Viewport;

  constructor(cfg: TowerConfig, viewport: Viewport, stiffness = 6) {
    this.cfg = cfg;
    this.stiffness = stiffness;
    this.camera = new PerspectiveCamera(cfg.camera.fovDeg, 1, 0.5, 300);
    this.framing = computeFraming(viewport, cfg.camera, cfg.level);
    this.viewport = viewport;
    this.resize(viewport);
  }

  get position(): number {
    return this.current;
  }

  get settled(): boolean {
    return this.current === this.goal;
  }

  /** Shot mode: no view offset, the level is centered (posters and calibration). */
  setCentered(centered: boolean): void {
    this.centered = centered;
    this.resize(this.viewport);
  }

  resize(viewport: Viewport): void {
    this.viewport = viewport;
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    this.framing = computeFraming({ width, height }, this.cfg.camera, this.cfg.level);
    this.camera.aspect = width / height;
    if (this.centered) {
      this.camera.clearViewOffset();
    } else {
      this.camera.setViewOffset(
        width,
        height,
        this.framing.viewOffsetX,
        this.framing.viewOffsetY,
        width,
        height,
      );
    }
    this.camera.updateProjectionMatrix();
    this.apply();
  }

  /** Sets where the lift goes; `cut` jumps there at once (reduced motion, deep links). */
  setGoal(position: number, cut = false): void {
    this.goal = position;
    if (cut) {
      this.current = position;
      this.apply();
    }
  }

  /** Moves toward the goal; returns true while still moving. */
  update(dtSeconds: number): boolean {
    if (this.current !== this.goal) {
      this.current = damp(this.current, this.goal, this.stiffness, dtSeconds);
      if (Math.abs(this.current - this.goal) < SETTLE_EPSILON) this.current = this.goal;
      this.apply();
    }
    return this.current !== this.goal;
  }

  private apply(): void {
    const pose = cameraPose(this.current, this.framing, this.cfg);
    this.camera.position.set(...pose.position);
    this.camera.lookAt(...pose.target);
  }
}
