import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TowerBus, type TowerEventOf } from '../events';
import { createHotspotManager } from './hotspots';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = {
    style: { cursor: '' },
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement;
  return canvas;
}

describe('HotspotManager', () => {
  let bus: TowerBus;
  let canvas: HTMLCanvasElement;
  let camera: PerspectiveCamera;
  let vibrateMock: ReturnType<typeof vi.fn<(ms: number) => void>>;

  beforeEach(() => {
    bus = new TowerBus();
    canvas = createMockCanvas();
    const cam = new PerspectiveCamera(45, 800 / 600, 0.1, 100);
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    camera = cam;
    vibrateMock = vi.fn((_ms: number) => {});
  });

  it('activates hotspot and emits bus event when ray intersects hitbox', () => {
    const emitted: Array<TowerEventOf<'hotspot:activated'>> = [];
    bus.on('hotspot:activated', (ev) => emitted.push(ev));

    const manager = createHotspotManager({
      canvas,
      camera,
      bus,
      vibrate: vibrateMock,
    });

    const hitMesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    hitMesh.name = 'hit__phone';
    hitMesh.position.set(0, 0, 0);
    hitMesh.updateMatrixWorld(true);

    manager.registerLevel('agents', [hitMesh]);

    // Center click (NDC 0, 0 -> clientX 400, clientY 300)
    const handled = manager.handlePointerDown({ clientX: 400, clientY: 300 } as MouseEvent);

    expect(handled).toBe(true);
    expect(emitted).toEqual([{ type: 'hotspot:activated', level: 'agents', action: 'phone' }]);
    expect(vibrateMock).toHaveBeenCalledWith(10);

    manager.dispose();
  });

  it('reads action from userData.action if specified', () => {
    const emitted: Array<TowerEventOf<'hotspot:activated'>> = [];
    bus.on('hotspot:activated', (ev) => emitted.push(ev));

    const manager = createHotspotManager({ canvas, camera, bus });

    const hitMesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    hitMesh.name = 'hit__custom';
    hitMesh.userData = { action: 'special-action' };
    hitMesh.position.set(0, 0, 0);
    hitMesh.updateMatrixWorld(true);

    manager.registerLevel('crm', [hitMesh]);

    const handled = manager.handlePointerDown({ clientX: 400, clientY: 300 } as MouseEvent);

    expect(handled).toBe(true);
    expect(emitted).toEqual([
      { type: 'hotspot:activated', level: 'crm', action: 'special-action' },
    ]);
    manager.dispose();
  });

  it('updates canvas cursor style on pointer move hover', () => {
    const manager = createHotspotManager({ canvas, camera, bus });

    const hitMesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    hitMesh.name = 'hit__lever';
    hitMesh.position.set(0, 0, 0);
    hitMesh.updateMatrixWorld(true);

    manager.registerLevel('roof', [hitMesh]);

    // Hover over center
    manager.handlePointerMove({ clientX: 400, clientY: 300 } as MouseEvent);
    expect(canvas.style.cursor).toBe('pointer');

    // Hover away (corner 10, 10)
    manager.handlePointerMove({ clientX: 10, clientY: 10 } as MouseEvent);
    expect(canvas.style.cursor).toBe('');

    manager.dispose();
  });

  it('unregisters level hits so unloaded levels do not intercept clicks', () => {
    const emitted: Array<TowerEventOf<'hotspot:activated'>> = [];
    bus.on('hotspot:activated', (ev) => emitted.push(ev));

    const manager = createHotspotManager({ canvas, camera, bus });

    const hitMesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    hitMesh.name = 'hit__phone';
    hitMesh.position.set(0, 0, 0);
    hitMesh.updateMatrixWorld(true);

    manager.registerLevel('agents', [hitMesh]);
    manager.unregisterLevel('agents');

    const handled = manager.handlePointerDown({ clientX: 400, clientY: 300 } as MouseEvent);
    expect(handled).toBe(false);
    expect(emitted).toHaveLength(0);

    manager.dispose();
  });
  it('reports where the main object of the floor the lift stands at is on screen', () => {
    const hints: Array<TowerEventOf<'hint:moved'>> = [];
    bus.on('hint:moved', (ev) => hints.push(ev));
    const manager = createHotspotManager({ canvas, camera, bus, vibrate: vibrateMock });
    const deal = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    deal.name = 'hit__deal';
    deal.userData.action = 'run-deal';
    deal.updateMatrixWorld(true);
    manager.registerLevel('crm', [deal]);

    manager.updateHint(2, true);
    expect(hints.at(-1)).toMatchObject({ level: 'crm', action: 'run-deal', visible: true, x: 400 });
    manager.updateHint(1.6, false);
    expect(hints.at(-1)?.visible).toBe(false);
    // A floor without its main hit box loaded shows no hint.
    manager.updateHint(1, true);
    expect(hints).toHaveLength(2);
  });
  it('lets people and robots react to a tap when no hotspot is under the pointer', () => {
    const taps: Array<TowerEventOf<'actor:tapped'>> = [];
    const activated: unknown[] = [];
    bus.on('actor:tapped', (ev) => taps.push(ev));
    bus.on('hotspot:activated', (ev) => activated.push(ev));
    const manager = createHotspotManager({ canvas, camera, bus, vibrate: vibrateMock });
    const person = new Mesh(new BoxGeometry(1, 2, 1), new MeshBasicMaterial());
    person.updateMatrixWorld(true);
    const react = vi.fn();
    manager.registerLevel('basement', [], () => [{ id: 'founder-lead', object: person, react }]);

    expect(manager.handlePointerDown({ clientX: 400, clientY: 300 } as PointerEvent)).toBe(true);
    expect(react).toHaveBeenCalledTimes(1);
    expect(taps).toEqual([{ type: 'actor:tapped', level: 'basement', actor: 'founder-lead' }]);
    expect(activated).toEqual([]);
    // Off to the side: nobody there.
    expect(manager.handlePointerDown({ clientX: 20, clientY: 20 } as PointerEvent)).toBe(false);
  });

  it('prefers the hotspot when a person stands in front of it', () => {
    const activated: unknown[] = [];
    bus.on('hotspot:activated', (ev) => activated.push(ev));
    const manager = createHotspotManager({ canvas, camera, bus, vibrate: vibrateMock });
    const hit = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    hit.name = 'hit__deal';
    hit.updateMatrixWorld(true);
    const person = new Mesh(new BoxGeometry(1, 2, 1), new MeshBasicMaterial());
    person.position.z = 3;
    person.updateMatrixWorld(true);
    const react = vi.fn();
    manager.registerLevel('crm', [hit], () => [{ id: 'clerk', object: person, react }]);
    manager.handlePointerDown({ clientX: 400, clientY: 300 } as PointerEvent);
    expect(activated).toHaveLength(1);
    expect(react).not.toHaveBeenCalled();
  });
});

describe('syncLevelHits', () => {
  it('registers loaded levels and unregisters the rest', async () => {
    const { syncLevelHits } = await import('./hotspots');
    const calls: string[] = [];
    const fake = {
      registerLevel: (id: string) => calls.push(`+${id}`),
      unregisterLevel: (id: string) => calls.push(`-${id}`),
    };
    syncLevelHits(fake, ['roof', 'agents'], (i) => (i === 0 ? { hits: [] } : undefined));
    expect(calls).toEqual(['+roof', '-agents']);
  });
});
