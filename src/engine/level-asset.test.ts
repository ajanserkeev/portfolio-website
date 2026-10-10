import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { disposeObject3D, type LevelAsset, type LevelSource, withFallback } from './level-asset';

function asset(name: string): LevelAsset {
  const root = new Group();
  root.name = name;
  return { root, anchors: new Map(), hits: [], dispose: () => {} };
}

describe('disposeObject3D', () => {
  it('disposes geometries, materials and textures', () => {
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const geometry = new BoxGeometry();
    const root = new Group();
    root.add(new Mesh(geometry, material));
    const spies = [geometry, material, texture].map((item) => {
      const spy = vi.fn();
      item.addEventListener('dispose', spy);
      return spy;
    });
    disposeObject3D(root);
    for (const spy of spies) expect(spy).toHaveBeenCalledOnce();
  });

  it('keeps shared resources alive', () => {
    const shared = new MeshBasicMaterial();
    const spy = vi.fn();
    shared.addEventListener('dispose', spy);
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(), shared));
    disposeObject3D(root, new Set([shared]));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('withFallback', () => {
  it('uses the primary source when it works', async () => {
    const source = withFallback(
      async () => asset('primary'),
      async () => asset('fallback'),
    );
    expect((await source(0, new AbortController().signal)).root.name).toBe('primary');
  });

  it('uses the fallback when the primary fails', async () => {
    const failing: LevelSource = async () => {
      throw new Error('404');
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const source = withFallback(failing, async () => asset('fallback'));
    expect((await source(0, new AbortController().signal)).root.name).toBe('fallback');
    warn.mockRestore();
  });

  it('does not fall back after an abort', async () => {
    const controller = new AbortController();
    controller.abort();
    const failing: LevelSource = async () => {
      throw new Error('aborted');
    };
    const source = withFallback(failing, async () => asset('fallback'));
    await expect(source(0, controller.signal)).rejects.toThrow('aborted');
  });
});
