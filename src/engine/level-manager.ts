import type { Object3D } from 'three';
import type { LevelAsset, LevelSource } from './level-asset';
import { keepWindow, type LevelStatus, planStreaming } from './streaming';

const RETRY_AFTER_MS = 5000;
const EVICT_RADIUS = 2;

/** Keeps the levels around the lift loaded and frees the rest. */
export class LevelManager {
  private readonly parent: Object3D;
  private readonly source: LevelSource;
  private readonly onChange: () => void;
  private readonly now: () => number;
  private readonly statuses: LevelStatus[];
  private readonly assets: Array<LevelAsset | null>;
  private readonly controllers: Array<AbortController | null>;
  private readonly failedAt: number[];
  private positions: number[] = [0];

  constructor(
    parent: Object3D,
    source: LevelSource,
    total: number,
    onChange: () => void = () => {},
    now: () => number = () => performance.now(),
  ) {
    this.parent = parent;
    this.source = source;
    this.onChange = onChange;
    this.now = now;
    this.statuses = Array.from({ length: total }, (): LevelStatus => 'absent');
    this.assets = Array.from({ length: total }, () => null);
    this.controllers = Array.from({ length: total }, () => null);
    this.failedAt = Array.from({ length: total }, () => Number.NEGATIVE_INFINITY);
  }

  /** `position` is where the camera is; `prefetch` (the scroll goal) is where it is heading. */
  update(position: number, prefetch: number = position): void {
    this.positions = [position, prefetch];
    const plan = planStreaming(this.statuses, this.positions);
    for (const index of plan.dispose) this.unload(index);
    for (const index of plan.load) {
      const failed = this.failedAt[index] ?? Number.NEGATIVE_INFINITY;
      if (this.now() - failed >= RETRY_AFTER_MS) this.load(index);
    }
  }

  ready(): number[] {
    return this.statuses.flatMap((status, index) => (status === 'ready' ? [index] : []));
  }

  asset(index: number): LevelAsset | null {
    return this.assets[index] ?? null;
  }

  dispose(): void {
    for (const controller of this.controllers) controller?.abort();
    for (const index of this.ready()) this.unload(index);
  }

  private load(index: number): void {
    const controller = new AbortController();
    this.controllers[index] = controller;
    this.statuses[index] = 'loading';
    this.source(index, controller.signal).then(
      (asset) => {
        this.controllers[index] = null;
        if (controller.signal.aborted || !this.isWanted(index)) {
          asset.dispose();
          this.statuses[index] = 'absent';
          return;
        }
        this.parent.add(asset.root);
        this.assets[index] = asset;
        this.statuses[index] = 'ready';
        this.onChange();
      },
      (error: unknown) => {
        this.controllers[index] = null;
        this.statuses[index] = 'absent';
        if (controller.signal.aborted) return;
        this.failedAt[index] = this.now();
        console.warn(`[tower] failed to load level ${index}`, error);
      },
    );
  }

  private unload(index: number): void {
    const asset = this.assets[index];
    if (!asset) return;
    asset.root.removeFromParent();
    asset.dispose();
    this.assets[index] = null;
    this.statuses[index] = 'absent';
    this.onChange();
  }

  private isWanted(index: number): boolean {
    return this.positions.some((position) => {
      const range = keepWindow(position, this.statuses.length, EVICT_RADIUS);
      return index >= range.from && index <= range.to;
    });
  }
}
