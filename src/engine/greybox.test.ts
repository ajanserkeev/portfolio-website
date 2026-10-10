import { type BufferGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { tower } from './config';
import { buildGreyboxLevel } from './greybox';

function meshes(index: number): Mesh[] {
  const result: Mesh[] = [];
  buildGreyboxLevel(index).root.traverse((node) => {
    if (node instanceof Mesh) result.push(node);
  });
  return result;
}

describe('buildGreyboxLevel', () => {
  it('names and positions the level root', () => {
    const level = buildGreyboxLevel(1);
    expect(level.root.name).toBe('level.agents');
    expect(level.root.position.y).toBe(-tower.level.height);
  });

  it('gives floors a back wall, side walls and three stations', () => {
    const names = meshes(2).map((mesh) => mesh.name);
    expect(names).toContain('greybox.back');
    expect(names).toContain('greybox.left');
    expect(names).toContain('greybox.right');
    expect(names.filter((name) => name.startsWith('greybox.station'))).toHaveLength(3);
  });

  it('leaves the roof open', () => {
    expect(meshes(0).map((mesh) => mesh.name)).not.toContain('greybox.back');
  });

  it('disposes every geometry it created', () => {
    const level = buildGreyboxLevel(3);
    const geometries: BufferGeometry[] = [];
    level.root.traverse((node) => {
      if (node instanceof Mesh) geometries.push(node.geometry);
    });
    let disposed = 0;
    for (const geometry of geometries) geometry.addEventListener('dispose', () => disposed++);
    level.dispose();
    expect(disposed).toBe(geometries.length);
  });

  it('rejects an unknown level index', () => {
    expect(() => buildGreyboxLevel(42)).toThrow();
  });
});
