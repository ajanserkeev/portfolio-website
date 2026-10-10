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

interface MockElement {
  listeners: Record<string, Array<(e: unknown) => void>>;
  attributes: Record<string, string>;
  addEventListener(type: string, cb: (e: unknown) => void): void;
  removeEventListener(type: string, cb: (e: unknown) => void): void;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  closest(selector: string): MockElement | null;
  dispatchEvent(event: { type: string; target?: MockElement }): void;
}

function createMockElement(tag: string, attrs: Record<string, string> = {}): MockElement {
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  const el: MockElement = {
    listeners,
    attributes: { ...attrs },
    addEventListener(type, cb) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    },
    removeEventListener(type, cb) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((fn) => fn !== cb);
      }
    },
    getAttribute(name) {
      return el.attributes[name] ?? null;
    },
    setAttribute(name, val) {
      el.attributes[name] = val;
    },
    closest(selector) {
      if (selector === 'button[data-hotspot][data-level]' && tag === 'button') {
        if (el.attributes['data-hotspot'] && el.attributes['data-level']) return el;
      }
      return null;
    },
    dispatchEvent(event) {
      event.target = el;
      for (const cb of listeners[event.type] ?? []) {
        cb(event);
      }
    },
  };
  return el;
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

  it('binds DOM buttons with [data-hotspot][data-level] for accessible activation', () => {
    const emitted: Array<TowerEventOf<'hotspot:activated'>> = [];
    bus.on('hotspot:activated', (ev) => emitted.push(ev));

    const manager = createHotspotManager({ canvas, camera, bus });

    const container = createMockElement('div');
    const button = createMockElement('button', {
      'data-hotspot': 'turn-on',
      'data-level': 'roof',
    });

    const unbind = manager.bindDom(container as unknown as ParentNode);

    // Simulate clicking button inside container
    const clickEvent = { type: 'click', target: button };
    for (const handler of container.listeners.click ?? []) {
      handler(clickEvent);
    }

    expect(emitted).toEqual([{ type: 'hotspot:activated', level: 'roof', action: 'turn-on' }]);

    unbind();
    for (const handler of container.listeners.click ?? []) {
      handler(clickEvent);
    }
    expect(emitted).toHaveLength(1);

    manager.dispose();
  });
});
