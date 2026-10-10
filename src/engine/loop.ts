export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(id: number): void;
}

export const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

export interface LoopOptions {
  /** After this long without activity, continuous rendering drops to idleFps. */
  idleAfterMs: number;
  idleFps: number;
}

export type RenderFn = (dtSeconds: number, timeMs: number) => void;

const DEFAULT_OPTIONS: LoopOptions = { idleAfterMs: 8000, idleFps: 30 };

/** Renders only when something changed or an animation needs frames. */
export class RenderLoop {
  private readonly render: RenderFn;
  private readonly scheduler: FrameScheduler;
  private readonly options: LoopOptions;
  private readonly continuousReasons = new Set<string>();
  private frameId: number | null = null;
  private pendingFrames = 0;
  private running = false;
  private lastFrameTime: number | null = null;
  private lastRenderTime = Number.NEGATIVE_INFINITY;
  private lastActivityTime = 0;

  constructor(
    render: RenderFn,
    scheduler: FrameScheduler = browserScheduler,
    options: LoopOptions = DEFAULT_OPTIONS,
  ) {
    this.render = render;
    this.scheduler = scheduler;
    this.options = options;
  }

  get scheduled(): boolean {
    return this.frameId !== null;
  }

  start(): void {
    this.running = true;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.frameId !== null) this.scheduler.cancel(this.frameId);
    this.frameId = null;
    this.lastFrameTime = null;
  }

  /** Requests at least `frames` renders; counts as visitor activity. */
  invalidate(frames = 1, nowMs?: number): void {
    this.pendingFrames = Math.max(this.pendingFrames, frames);
    this.markActivity(nowMs);
    this.schedule();
  }

  markActivity(nowMs?: number): void {
    this.lastActivityTime = nowMs ?? performance.now();
  }

  setContinuous(reason: string, on: boolean): void {
    if (on) this.continuousReasons.add(reason);
    else this.continuousReasons.delete(reason);
    this.schedule();
  }

  private hasWork(): boolean {
    return this.pendingFrames > 0 || this.continuousReasons.size > 0;
  }

  private schedule(): void {
    if (!this.running || this.frameId !== null) return;
    if (!this.hasWork()) {
      this.lastFrameTime = null;
      return;
    }
    this.frameId = this.scheduler.request(this.tick);
  }

  private readonly tick = (timeMs: number): void => {
    this.frameId = null;
    const idle =
      this.pendingFrames === 0 && timeMs - this.lastActivityTime > this.options.idleAfterMs;
    const minInterval = idle ? 1000 / this.options.idleFps : 0;
    if (timeMs - this.lastRenderTime >= minInterval - 1) {
      const dt =
        this.lastFrameTime === null ? 0 : Math.min((timeMs - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = timeMs;
      this.lastRenderTime = timeMs;
      if (this.pendingFrames > 0) this.pendingFrames -= 1;
      this.render(dt, timeMs);
    }
    this.schedule();
  };
}
