import { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createElevator } from './elevator';
import { buildElevatorModel } from './elevator-model';

const dims = { shaft: { x: -5.2, z: 2.2, width: 1.15, depth: 1.15 }, levelHeight: 4, levels: 6 };

function setup(instant = false) {
  const model = buildElevatorModel(dims, new MeshBasicMaterial());
  return { model, lift: createElevator(model, { ...dims, instant }) };
}

describe('createElevator', () => {
  it('rides with the lift position', () => {
    const { model, lift } = setup();
    lift.update(0, 2.5, false);
    expect(model.cabin.position.y).toBeCloseTo(-10);
  });

  it('opens the doors only once the lift stands at a floor, and shuts them to move on', () => {
    const { model, lift } = setup();
    lift.update(0.1, 2.5, false);
    expect(lift.openness).toBe(0);
    lift.update(0.1, 3, true);
    lift.update(1, 3, true);
    expect(lift.openness).toBe(1);
    expect(model.doorRight.position.x).toBeGreaterThan(model.doorRest);
    expect(model.doorLeft.position.x).toBeLessThan(-model.doorRest);
    lift.update(1, 3.3, false);
    expect(lift.openness).toBe(0);
  });

  it('turns the needle from the roof (left) to the basement (right)', () => {
    const { model, lift } = setup(true);
    lift.update(0, 0, true);
    const roof = model.needle.rotation.z;
    lift.update(0, 5, true);
    expect(roof).toBeCloseTo(Math.PI / 2);
    expect(model.needle.rotation.z).toBeCloseTo(-Math.PI / 2);
  });

  it('reports motion while the doors slide', () => {
    const { lift } = setup();
    expect(lift.update(0.1, 1, true)).toBe(true);
    expect(lift.update(1, 1, true)).toBe(false);
  });
});
