export interface DoorsOptions {
  /** Time for a full open or close. */
  openSeconds?: number;
  /** Reduced motion: no animation, the doors are simply open or shut. */
  instant?: boolean;
}

export interface Doors {
  readonly moving: boolean;
  open(): void;
  close(): void;
  /** Advances by dt and returns how open the doors are: 0 shut … 1 open (eased). */
  update(dtSeconds: number): number;
}

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Sliding cabin doors. Progress is linear in time; the returned openness is eased. */
export function createDoors({ openSeconds = 0.6, instant = false }: DoorsOptions = {}): Doors {
  let progress = 0;
  let target = 0;
  return {
    get moving() {
      return progress !== target;
    },
    open() {
      target = 1;
    },
    close() {
      target = 0;
    },
    update(dtSeconds) {
      if (instant) progress = target;
      else if (progress !== target) {
        const step = dtSeconds / openSeconds;
        progress =
          target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step);
      }
      return easeInOutQuad(progress);
    },
  };
}
