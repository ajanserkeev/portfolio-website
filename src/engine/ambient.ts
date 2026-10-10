import type { MeshBasicMaterial } from 'three';
import { type MotionPolicy, motionPolicy } from './tiers';

export interface AmbientOptions {
  motion: MotionPolicy;
  glowMaterial?: MeshBasicMaterial;
  idleAfterMs?: number;
  idleFps?: number;
  mediaQuery?: MediaQueryList;
  onActiveChange?: (active: boolean) => void;
}

export interface AmbientManager {
  readonly motion: MotionPolicy;
  readonly active: boolean;
  readonly isIdle: boolean;
  setAnimated(animated: boolean): void;
  setMotion(motion: MotionPolicy): void;
  markActivity(nowMs?: number): void;
  update(timeMs: number): boolean;
  register(callback: (timeSec: number) => void): () => void;
  dispose(): void;
}

const DEFAULT_IDLE_AFTER_MS = 5000;
const DEFAULT_IDLE_FPS = 30;

class AmbientManagerImpl implements AmbientManager {
  private _motion: MotionPolicy;
  private readonly glowMaterial?: MeshBasicMaterial;
  private readonly idleAfterMs: number;
  private readonly idleFps: number;
  private readonly onActiveChange?: (active: boolean) => void;
  private readonly mediaQuery?: MediaQueryList;
  private readonly mediaQueryListener?: (e: { matches: boolean }) => void;

  private animated = false;
  private _isIdle = false;
  private lastActivityTime = 0;
  private lastUpdateTime: number | null = null;
  private callbacks = new Set<(timeSec: number) => void>();

  constructor(options: AmbientOptions) {
    this._motion = options.motion;
    this.glowMaterial = options.glowMaterial;
    this.idleAfterMs = options.idleAfterMs ?? DEFAULT_IDLE_AFTER_MS;
    this.idleFps = options.idleFps ?? DEFAULT_IDLE_FPS;
    this.onActiveChange = options.onActiveChange;

    if (options.mediaQuery) {
      this.mediaQuery = options.mediaQuery;
      this.mediaQueryListener = (e: { matches: boolean }) => {
        this.setMotion(motionPolicy(e.matches));
      };
      this.mediaQuery.addEventListener?.('change', this.mediaQueryListener);
    }
  }

  get motion(): MotionPolicy {
    return this._motion;
  }

  get active(): boolean {
    return this._motion.ambient && this.animated;
  }

  get isIdle(): boolean {
    return this._isIdle;
  }

  setAnimated(animated: boolean): void {
    const prev = this.active;
    this.animated = animated;
    if (this.active !== prev) {
      this.notifyActiveChange();
    }
  }

  setMotion(motion: MotionPolicy): void {
    const prev = this.active;
    this._motion = motion;
    if (!this._motion.ambient && this.glowMaterial) {
      this.glowMaterial.color.setRGB(1, 1, 1);
    }
    if (this.active !== prev) {
      this.notifyActiveChange();
    }
  }

  markActivity(nowMs?: number): void {
    this.lastActivityTime = nowMs ?? (typeof performance !== 'undefined' ? performance.now() : 0);
    this._isIdle = false;
  }

  update(timeMs: number): boolean {
    if (!this.active) {
      if (this.glowMaterial) {
        this.glowMaterial.color.setRGB(1, 1, 1);
      }
      return false;
    }

    const idle = timeMs - this.lastActivityTime > this.idleAfterMs;
    this._isIdle = idle;
    const minInterval = idle ? 1000 / this.idleFps : 0;

    if (this.lastUpdateTime !== null && timeMs - this.lastUpdateTime < minInterval - 1) {
      return false;
    }

    this.lastUpdateTime = timeMs;
    const timeSec = timeMs / 1000;

    if (this.glowMaterial) {
      // Subtle rhythmic pulse + occasional high-tech server LED blink
      const pulse = 0.9 + 0.15 * Math.sin(timeSec * 3.0);
      const blink = Math.sin(timeSec * 8.0) > 0.85 ? 1.25 : 1.0;
      const v = Math.min(Math.max(pulse * blink, 0.5), 1.5);
      this.glowMaterial.color.setRGB(v, v, v);
    }

    for (const callback of this.callbacks) {
      callback(timeSec);
    }

    return true;
  }

  register(callback: (timeSec: number) => void): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  dispose(): void {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener?.('change', this.mediaQueryListener);
    }
    this.callbacks.clear();
    if (this.glowMaterial) {
      this.glowMaterial.color.setRGB(1, 1, 1);
    }
  }

  private notifyActiveChange(): void {
    this.onActiveChange?.(this.active);
  }
}

export function createAmbientManager(options: AmbientOptions): AmbientManager {
  return new AmbientManagerImpl(options);
}
