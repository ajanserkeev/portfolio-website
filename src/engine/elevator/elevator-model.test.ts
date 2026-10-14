import { Box3, type BufferGeometry, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { buildElevatorModel, CABIN } from './elevator-model';

/** Vertical extent of the vertices the geometry's draw range covers (mesh-local). */
function drawnY(geometry: BufferGeometry): [number, number] {
  const position = geometry.getAttribute('position');
  const { start, count } = geometry.drawRange;
  let min = Infinity;
  let max = -Infinity;
  for (let i = start; i < Math.min(start + count, position.count); i += 1) {
    min = Math.min(min, position.getY(i));
    max = Math.max(max, position.getY(i));
  }
  return [min, max];
}

const dims = { shaft: { x: -5.2, z: 2.2, width: 1.15, depth: 1.15 }, levelHeight: 4, levels: 6 };

describe('buildElevatorModel', () => {
  it('builds the cage inside the shaft footprint, from the basement floor to above the roof', () => {
    const model = buildElevatorModel(dims, new MeshBasicMaterial());
    const box = new Box3().setFromObject(model.shaft);
    expect(box.min.x).toBeGreaterThanOrEqual(-5.2 - 1.15 / 2 - 0.06);
    expect(box.max.x).toBeLessThanOrEqual(-5.2 + 1.15 / 2 + 0.06);
    expect(box.min.y).toBeCloseTo(-20, 1);
    expect(box.max.y).toBeGreaterThan(2.8);
    expect(model.shaft.geometry.getAttribute('color')).toBeDefined();
  });

  it('keeps the cabin and its doors inside the cage', () => {
    const model = buildElevatorModel(dims, new MeshBasicMaterial());
    const box = new Box3().setFromObject(model.cabin);
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(1.15);
    expect(box.max.z - box.min.z).toBeLessThanOrEqual(1.15);
    expect(box.max.y - box.min.y).toBeCloseTo(CABIN.height, 1);
  });

  it('has one mesh for the cage and four for the cabin (body, two doors, needle)', () => {
    const model = buildElevatorModel(dims, new MeshBasicMaterial());
    let meshes = 0;
    model.cabin.traverse((node) => {
      if ((node as { isMesh?: boolean }).isMesh) meshes += 1;
    });
    expect(meshes).toBe(4);
  });

  it('draws only the storeys of the loaded floors', () => {
    const model = buildElevatorModel(dims, new MeshBasicMaterial());
    model.showLevels([2, 1, 3]);
    const [min, max] = drawnY(model.shaft.geometry);
    expect(min).toBeGreaterThanOrEqual(-12.1);
    expect(min).toBeLessThan(-11.9);
    expect(max).toBeLessThanOrEqual(0.1);
    model.showLevels([0]);
    expect(drawnY(model.shaft.geometry)[1]).toBeGreaterThan(2.8);
    model.showLevels([5]);
    expect(drawnY(model.shaft.geometry)[0]).toBeCloseTo(-20, 1);
    model.showLevels([]);
    expect(model.shaft.geometry.drawRange.count).toBe(0);
  });
});
