import { describe, expect, it } from 'vitest';
import { type FrameScheduler, RenderLoop } from './loop';

class FakeScheduler implements FrameScheduler {
  private callbacks = new Map<number, (timeMs: number) => void>();
  private nextId = 1;

  request(callback: (timeMs: number) => void): number {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  }

  cancel(id: number): void {
    this.callbacks.delete(id);
  }

  get pending(): number {
    return this.callbacks.size;
  }

  frame(timeMs: number): void {
    const due = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of due) callback(timeMs);
  }
}

function setup() {
  const scheduler = new FakeScheduler();
  const renders: Array<{ dt: number; time: number }> = [];
  const loop = new RenderLoop((dt, time) => renders.push({ dt, time }), scheduler, {
    idleAfterMs: 8000,
    idleFps: 30,
  });
  return { scheduler, renders, loop };
}

describe('RenderLoop', () => {
  it('schedules nothing without work', () => {
    const { scheduler, loop } = setup();
    loop.start();
    expect(scheduler.pending).toBe(0);
  });

  it('renders once per invalidate and then goes quiet', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.invalidate(1, 0);
    scheduler.frame(16);
    expect(renders).toHaveLength(1);
    expect(scheduler.pending).toBe(0);
  });

  it('renders the requested number of frames', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.invalidate(3, 0);
    scheduler.frame(16);
    scheduler.frame(32);
    scheduler.frame(48);
    expect(renders).toHaveLength(3);
    expect(scheduler.pending).toBe(0);
  });

  it('renders every frame while continuous and stops when released', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('camera', true);
    for (let t = 16; t <= 160; t += 16) scheduler.frame(t);
    expect(renders).toHaveLength(10);
    loop.setContinuous('camera', false);
    scheduler.frame(176);
    expect(scheduler.pending).toBe(0);
  });

  it('throttles to the idle frame rate after inactivity', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('ambient', true);
    for (let t = 1000 / 60; t <= 10_000; t += 1000 / 60) scheduler.frame(t);
    const lastTwoSeconds = renders.filter((r) => r.time > 8000).length;
    expect(lastTwoSeconds).toBeGreaterThanOrEqual(55);
    expect(lastTwoSeconds).toBeLessThanOrEqual(65);
  });

  it('renders at full rate again right after activity', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('ambient', true);
    scheduler.frame(9000);
    loop.invalidate(1, 9001);
    const before = renders.length;
    scheduler.frame(9016);
    scheduler.frame(9032);
    expect(renders.length - before).toBe(2);
  });

  it('stop cancels the pending frame and start resumes pending work', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.invalidate(1, 0);
    loop.stop();
    expect(scheduler.pending).toBe(0);
    loop.start();
    scheduler.frame(16);
    expect(renders).toHaveLength(1);
  });

  it('starts with dt = 0 and clamps long gaps to 0.1 s', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('camera', true);
    scheduler.frame(100);
    scheduler.frame(2000);
    expect(renders[0]?.dt).toBe(0);
    expect(renders[1]?.dt).toBe(0.1);
  });
});
