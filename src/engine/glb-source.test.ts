import { BoxGeometry, Group, Mesh, MeshBasicMaterial, type Object3D, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { tower } from './config';
import { createGlbSource, type GlbLoaders, levelFilesFromGlob } from './glb-source';
import { greyboxSource } from './greybox';
import { withFallback } from './level-asset';
import { createSharedMaterials } from './materials/shared';

const shared = createSharedMaterials({
  matcap: new Texture(),
  screens: new Texture(),
  faces: new Texture(),
});

function loaders(
  scene: () => Object3D = () => {
    const root = new Group();
    const statik = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    statik.name = 'static';
    root.add(statik);
    return root;
  },
): GlbLoaders {
  return {
    loadGltf: async () => ({ scene: scene() }),
    loadTexture: async () => new Texture(),
  };
}

describe('levelFilesFromGlob', () => {
  it('pairs GLB files with their lightmaps and skips incomplete pairs', () => {
    const files = levelFilesFromGlob({
      '../assets/levels/agents.glb': '/_astro/agents.123.glb',
      '../assets/levels/agents.lightmap.webp': '/_astro/agents.lightmap.456.webp',
      '../assets/levels/crm.glb': '/_astro/crm.789.glb',
    });
    expect(files.get('agents')).toEqual({
      glb: '/_astro/agents.123.glb',
      lightmap: '/_astro/agents.lightmap.456.webp',
    });
    expect(files.has('crm')).toBe(false);
  });
});

describe('createGlbSource', () => {
  const files = new Map([['agents', { glb: 'a.glb', lightmap: 'a.webp' }]]);

  it('builds a positioned level with the baked material', async () => {
    const asset = await createGlbSource(files, shared, loaders())(1, new AbortController().signal);
    expect(asset.root.name).toBe('level.agents');
    expect(asset.root.position.y).toBe(-tower.level.height);
    expect(asset.root.userData.source).toBe('glb');
  });

  it('rejects levels that were not built yet', async () => {
    await expect(
      createGlbSource(files, shared, loaders())(2, new AbortController().signal),
    ).rejects.toThrow(/no built assets/);
  });

  it('falls back to the greybox for a missing level', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const source = withFallback(createGlbSource(files, shared, loaders()), greyboxSource);
    const asset = await source(2, new AbortController().signal);
    expect(asset.root.name).toBe('level.crm');
    expect(asset.root.userData.source).toBeUndefined();
    warn.mockRestore();
  });

  it('throws away a level that finished loading after an abort', async () => {
    const controller = new AbortController();
    const promise = createGlbSource(files, shared, loaders())(1, controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow(/aborted/);
  });
});
