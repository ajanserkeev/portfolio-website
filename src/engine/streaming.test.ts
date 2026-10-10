import { describe, expect, it } from 'vitest';
import { keepWindow, type LevelStatus, planStreaming } from './streaming';

const all = (status: LevelStatus, count = 6): LevelStatus[] => Array(count).fill(status);

describe('keepWindow', () => {
  it('covers both neighbours while travelling between levels', () => {
    expect(keepWindow(2.5, 6, 1)).toEqual({ from: 1, to: 4 });
  });

  it('clamps at the ends', () => {
    expect(keepWindow(0, 6, 1)).toEqual({ from: 0, to: 1 });
    expect(keepWindow(5, 6, 1)).toEqual({ from: 4, to: 5 });
  });

  it('treats NaN as the top', () => {
    expect(keepWindow(Number.NaN, 6, 1)).toEqual({ from: 0, to: 1 });
  });
});

describe('planStreaming', () => {
  it('loads the roof and the first floor at the start', () => {
    expect(planStreaming(all('absent'), 0)).toEqual({ load: [0, 1], dispose: [] });
  });

  it('loads the nearest levels first', () => {
    expect(planStreaming(all('absent'), 2.5).load).toEqual([2, 3, 1, 4]);
  });

  it('disposes ready levels beyond the hysteresis window', () => {
    expect(planStreaming(all('ready'), 4)).toEqual({ load: [], dispose: [0, 1] });
  });

  it('keeps a ready level two floors away (hysteresis)', () => {
    const statuses: LevelStatus[] = ['absent', 'ready', 'ready', 'ready', 'ready', 'absent'];
    expect(planStreaming(statuses, 3).dispose).toEqual([]);
  });

  it('never disposes a level that is still loading', () => {
    const statuses: LevelStatus[] = ['loading', 'absent', 'absent', 'absent', 'absent', 'absent'];
    expect(planStreaming(statuses, 5).dispose).toEqual([]);
  });

  it('respects a custom radius', () => {
    expect(planStreaming(all('absent'), 0, 2).load).toEqual([0, 1, 2]);
  });
});
