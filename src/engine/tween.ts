export type EasingFunction = (t: number) => number;

export const easings = {
  linear: (t: number): number => t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number): number => {
    const p = t - 1;
    return p * p * p + 1;
  },
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
      const p = t - 1.5 / d1;
      return n1 * p * p + 0.75;
    }
    if (t < 2.5 / d1) {
      const p = t - 2.25 / d1;
      return n1 * p * p + 0.9375;
    }
    const p = t - 2.625 / d1;
    return n1 * p * p + 0.984375;
  },
} as const;

export type EasingName = keyof typeof easings;

export interface TweenOptions {
  from: number;
  to: number;
  durationSec: number;
  ease?: EasingName | EasingFunction;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export interface ActiveTween {
  readonly id: number;
  stop(): void;
}

interface InternalTween {
  id: number;
  from: number;
  to: number;
  startSec: number;
  durationSec: number;
  easeFn: EasingFunction;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
  stopped: boolean;
}

export class TweenManager {
  private nextId = 1;
  private tweens: InternalTween[] = [];

  add(options: TweenOptions, currentTimeSec: number): ActiveTween {
    const easeFn =
      typeof options.ease === 'function'
        ? options.ease
        : options.ease
          ? easings[options.ease]
          : easings.linear;

    const id = this.nextId++;
    const tween: InternalTween = {
      id,
      from: options.from,
      to: options.to,
      startSec: currentTimeSec,
      durationSec: Math.max(0, options.durationSec),
      easeFn,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      stopped: false,
    };

    this.tweens.push(tween);

    return {
      id,
      stop: () => {
        tween.stopped = true;
        this.tweens = this.tweens.filter((t) => t.id !== id);
      },
    };
  }

  update(currentTimeSec: number): void {
    if (this.tweens.length === 0) return;

    const remaining: InternalTween[] = [];

    for (const tween of this.tweens) {
      if (tween.stopped) continue;

      if (tween.durationSec <= 0) {
        tween.onUpdate(tween.to);
        tween.onComplete?.();
        continue;
      }

      const elapsed = currentTimeSec - tween.startSec;
      if (elapsed >= tween.durationSec) {
        tween.onUpdate(tween.to);
        tween.onComplete?.();
      } else {
        const progress = Math.max(0, Math.min(1, elapsed / tween.durationSec));
        const eased = tween.easeFn(progress);
        const value = tween.from + (tween.to - tween.from) * eased;
        tween.onUpdate(value);
        remaining.push(tween);
      }
    }

    this.tweens = remaining;
  }

  stopAll(): void {
    for (const tween of this.tweens) {
      tween.stopped = true;
    }
    this.tweens = [];
  }

  get activeCount(): number {
    return this.tweens.length;
  }
}
