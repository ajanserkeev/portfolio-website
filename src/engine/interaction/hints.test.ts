import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { createHintEmitter, type HintEvent, projectHint } from './hints';

const rect = { left: 0, top: 0, width: 800, height: 600 };

function camera(): PerspectiveCamera {
  const cam = new PerspectiveCamera(45, 800 / 600, 0.1, 100);
  cam.position.set(0, 0, 10);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

function box(x: number, y: number, z: number, height = 1): Mesh {
  const mesh = new Mesh(new BoxGeometry(2, height, 2), new MeshBasicMaterial());
  mesh.position.set(x, y, z);
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('projectHint', () => {
  it('points at the top centre of the hit box in CSS pixels', () => {
    const point = projectHint(box(0, 0, 0), camera(), rect);
    expect(point?.x).toBeCloseTo(400, 0);
    // The top of a 2 m box at the origin is above the screen centre.
    expect(point?.y).toBeLessThan(300);
    expect(point?.y).toBeGreaterThan(150);
  });

  it('offsets by the canvas position and ignores boxes behind the camera', () => {
    const point = projectHint(box(0, 0, 0), camera(), { ...rect, left: 20, top: 10 });
    expect(point?.x).toBeCloseTo(420, 0);
    expect(projectHint(box(0, 0, 20), camera(), rect)).toBeNull();
  });
});

describe('projectHint on tall objects', () => {
  it('points at the middle of a tall object (a wall phone), not its top near the ceiling', () => {
    const point = projectHint(box(0, 0, 0, 3), camera(), rect);
    expect(point?.y).toBeCloseTo(300, 0);
  });
});

describe('createHintEmitter', () => {
  it('emits only when the chip would visibly change', () => {
    const events: HintEvent[] = [];
    const emit = createHintEmitter((event) => events.push(event));
    const at = { level: 'crm' as const, action: 'run-deal', visible: true };
    emit({ ...at, x: 100.2, y: 50.4 });
    emit({ ...at, x: 100.4, y: 49.6 });
    emit({ ...at, x: 103, y: 50 });
    emit({ ...at, visible: false, x: 0, y: 0 });
    emit({ ...at, visible: false, x: 5, y: 5 });
    expect(events.map((e) => [e.visible, e.x, e.y])).toEqual([
      [true, 100, 50],
      [true, 103, 50],
      [false, 0, 0],
    ]);
    expect(events[0]?.type).toBe('hint:moved');
  });
});
