/** A timed reaction to a tap. Tapping again while it plays extends it instead of stacking. */
export interface ReactionTimer {
  readonly active: boolean;
  /** 0 at the start … 1 at the end (restarts when extended). */
  readonly progress: number;
  /** Starts or extends the reaction (by `length` seconds if given); true when it was not playing. */
  trigger(length?: number): boolean;
  /** Advances time; true on the frame the reaction ends. */
  update(dtSeconds: number): boolean;
  /** Stops at once without reporting an end. */
  cancel(): void;
}

export function createReactionTimer(seconds: number): ReactionTimer {
  let left = 0;
  let total = seconds;
  return {
    get active() {
      return left > 0;
    },
    get progress() {
      return left > 0 ? 1 - left / total : 0;
    },
    trigger(length = seconds) {
      const started = left <= 0;
      total = length;
      left = length;
      return started;
    },
    cancel() {
      left = 0;
    },
    update(dtSeconds) {
      if (left <= 0) return false;
      left -= dtSeconds;
      return left <= 0;
    },
  };
}

/** Counts taps in a row; a pause longer than `windowSeconds` starts over. */
export function createTapCounter(windowSeconds: number): { tap(nowSeconds: number): number } {
  let count = 0;
  let last = Number.NEGATIVE_INFINITY;
  return {
    tap(nowSeconds) {
      count = nowSeconds - last > windowSeconds ? 1 : count + 1;
      last = nowSeconds;
      return count;
    },
  };
}
