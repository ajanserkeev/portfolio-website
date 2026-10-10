import { Group } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { LevelAsset, LevelSource } from './level-asset';
import { LevelManager } from './level-manager';

interface Deferred {
  index: number;
  resolve: (asset: LevelAsset) => void;
  reject: (error: unknown) => void;
}

function fakeAsset(index: number) {
  const root = new Group();
  root.name = `level-${index}`;
  const state = { disposed: false };
  const asset: LevelAsset = {
    root,
    anchors: new Map(),
    hits: [],
    dispose: () => {
      state.disposed = true;
    },
  };
  return { asset, state };
}

function setup(total = 6) {
  const requests: Deferred[] = [];
  const source: LevelSource = (index) =>
    new Promise((resolve, reject) => requests.push({ index, resolve, reject }));
  const parent = new Group();
  const onChange = vi.fn();
  let now = 0;
  const manager = new LevelManager(parent, source, total, onChange, () => now);
  return { requests, parent, onChange, manager, setNow: (t: number) => (now = t) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('LevelManager', () => {
  it('requests the current level and its neighbour first', () => {
    const { requests, manager } = setup();
    manager.update(0);
    expect(requests.map((r) => r.index)).toEqual([0, 1]);
  });

  it('adds a loaded level to the scene and reports the change', async () => {
    const { requests, parent, onChange, manager } = setup();
    manager.update(0);
    const { asset } = fakeAsset(0);
    requests[0]?.resolve(asset);
    await flush();
    expect(parent.children).toContain(asset.root);
    expect(manager.ready()).toEqual([0]);
    expect(onChange).toHaveBeenCalled();
  });

  it('does not request a level twice while it is loading', () => {
    const { requests, manager } = setup();
    manager.update(0);
    manager.update(0.2);
    const indices = requests.map((r) => r.index);
    expect(indices.slice(0, 2)).toEqual([0, 1]);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('unloads levels that the lift left behind', async () => {
    const { requests, parent, manager } = setup();
    manager.update(0);
    const roof = fakeAsset(0);
    requests[0]?.resolve(roof.asset);
    requests[1]?.resolve(fakeAsset(1).asset);
    await flush();
    manager.update(4);
    expect(roof.state.disposed).toBe(true);
    expect(parent.children).not.toContain(roof.asset.root);
    expect(manager.ready()).not.toContain(0);
  });

  it('keeps the floors the camera is looking at when the scroll goal jumps far ahead', async () => {
    const { requests, manager } = setup();
    manager.update(0);
    const roof = fakeAsset(0);
    const first = fakeAsset(1);
    requests[0]?.resolve(roof.asset);
    requests[1]?.resolve(first.asset);
    await flush();
    // The camera is still at the roof while the scroll goal is already at the basement.
    manager.update(0, 5);
    expect(roof.state.disposed).toBe(false);
    expect(first.state.disposed).toBe(false);
    expect(manager.ready()).toEqual([0, 1]);
    expect(requests.map((r) => r.index)).toEqual(expect.arrayContaining([4, 5]));
  });

  it('keeps a prefetched level that arrives while the camera is still travelling', async () => {
    const { requests, parent, manager } = setup();
    manager.update(0, 5);
    const basement = requests.find((r) => r.index === 5);
    const asset = fakeAsset(5);
    basement?.resolve(asset.asset);
    await flush();
    expect(parent.children).toContain(asset.asset.root);
  });

  it('throws away a level that arrives after the lift moved far away', async () => {
    const { requests, parent, manager } = setup();
    manager.update(0);
    manager.update(5);
    const late = fakeAsset(0);
    requests[0]?.resolve(late.asset);
    await flush();
    expect(late.state.disposed).toBe(true);
    expect(parent.children).not.toContain(late.asset.root);
  });

  it('retries a failed level only after a pause', async () => {
    const { requests, manager, setNow } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    manager.update(0);
    requests[0]?.reject(new Error('network'));
    await flush();
    setNow(1000);
    manager.update(0);
    expect(requests.filter((r) => r.index === 0)).toHaveLength(1);
    setNow(7000);
    manager.update(0);
    expect(requests.filter((r) => r.index === 0)).toHaveLength(2);
    warn.mockRestore();
  });

  it('dispose() unloads everything', async () => {
    const { requests, manager } = setup();
    manager.update(0);
    const roof = fakeAsset(0);
    requests[0]?.resolve(roof.asset);
    await flush();
    manager.dispose();
    expect(roof.state.disposed).toBe(true);
    expect(manager.ready()).toEqual([]);
  });
});
