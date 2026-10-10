import { describe, expect, it, vi } from 'vitest';
import { easings, TweenManager } from './tween';

describe('TweenManager', () => {
  it('interpolates value from start to finish linearly', () => {
    const manager = new TweenManager();
    const values: number[] = [];

    manager.add(
      {
        from: 0,
        to: 100,
        durationSec: 1.0,
        ease: 'linear',
        onUpdate: (v) => values.push(v),
      },
      0.0,
    );

    manager.update(0.25);
    manager.update(0.5);
    manager.update(1.0);

    expect(values).toEqual([25, 50, 100]);
    expect(manager.activeCount).toBe(0);
  });

  it('supports easeOutQuad and calls onComplete at the end', () => {
    const manager = new TweenManager();
    const updates: number[] = [];
    const complete = vi.fn();

    manager.add(
      {
        from: 0,
        to: 1,
        durationSec: 1.0,
        ease: 'easeOutQuad',
        onUpdate: (v) => updates.push(v),
        onComplete: complete,
      },
      10.0,
    );

    expect(manager.activeCount).toBe(1);

    // at t = 0.5: easeOutQuad(0.5) = 0.5 * (2 - 0.5) = 0.75
    manager.update(10.5);
    expect(updates[0]).toBeCloseTo(0.75, 5);
    expect(complete).not.toHaveBeenCalled();

    manager.update(11.0);
    expect(updates[1]).toBe(1);
    expect(complete).toHaveBeenCalledOnce();
    expect(manager.activeCount).toBe(0);
  });

  it('handles duration <= 0 instantaneously on first update', () => {
    const manager = new TweenManager();
    const updates: number[] = [];
    const complete = vi.fn();

    manager.add(
      {
        from: 5,
        to: 50,
        durationSec: 0,
        onUpdate: (v) => updates.push(v),
        onComplete: complete,
      },
      0.0,
    );

    manager.update(0.0);
    expect(updates).toEqual([50]);
    expect(complete).toHaveBeenCalledOnce();
    expect(manager.activeCount).toBe(0);
  });

  it('allows stopping an active tween before completion', () => {
    const manager = new TweenManager();
    const updates: number[] = [];
    const complete = vi.fn();

    const tween = manager.add(
      {
        from: 0,
        to: 10,
        durationSec: 2.0,
        onUpdate: (v) => updates.push(v),
        onComplete: complete,
      },
      0.0,
    );

    manager.update(1.0);
    expect(updates).toEqual([5]);

    tween.stop();
    expect(manager.activeCount).toBe(0);

    manager.update(2.0);
    expect(updates).toEqual([5]);
    expect(complete).not.toHaveBeenCalled();
  });

  it('stopAll cancels all ongoing tweens without triggering onComplete', () => {
    const manager = new TweenManager();
    const complete1 = vi.fn();
    const complete2 = vi.fn();

    manager.add({ from: 0, to: 1, durationSec: 1, onUpdate: () => {}, onComplete: complete1 }, 0);
    manager.add({ from: 0, to: 2, durationSec: 1, onUpdate: () => {}, onComplete: complete2 }, 0);

    expect(manager.activeCount).toBe(2);

    manager.stopAll();
    expect(manager.activeCount).toBe(0);

    manager.update(1.0);
    expect(complete1).not.toHaveBeenCalled();
    expect(complete2).not.toHaveBeenCalled();
  });

  it('supports custom easing functions', () => {
    const manager = new TweenManager();
    let latest = 0;

    manager.add(
      {
        from: 0,
        to: 10,
        durationSec: 1.0,
        ease: (t) => t * t, // custom square
        onUpdate: (v) => {
          latest = v;
        },
      },
      0.0,
    );

    manager.update(0.5);
    expect(latest).toBeCloseTo(2.5, 5); // 10 * 0.25 = 2.5
  });

  it('provides standard easing math functions', () => {
    expect(easings.linear(0.5)).toBe(0.5);
    expect(easings.easeOutCubic(0)).toBe(0);
    expect(easings.easeOutCubic(1)).toBe(1);
    expect(easings.easeOutBounce(1)).toBe(1);
  });
});
