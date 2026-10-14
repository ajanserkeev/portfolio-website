import { type Camera, type Object3D, Raycaster, Vector2 } from 'three';
import { FLOOR_ACTIONS } from '../../ui/floor-actions';
import { LEVEL_IDS, type LevelId } from '../config';
import { bus as defaultBus, type TowerBus } from '../events';
import { createHintEmitter, projectHint } from './hints';

export interface HotspotManagerOptions {
  canvas: HTMLCanvasElement;
  camera: Camera;
  bus?: TowerBus;
  vibrate?: (ms: number) => void;
}

export interface HotspotManager {
  registerLevel(levelId: LevelId, hits: readonly Object3D[]): void;
  unregisterLevel(levelId: LevelId): void;
  trigger(levelId: LevelId, action: string): void;
  handlePointerDown(event: MouseEvent | PointerEvent): boolean;
  handlePointerMove(event: MouseEvent | PointerEvent): boolean;
  /** After a render: emits `hint:moved` for the main object of the floor the lift stands at. */
  updateHint(position: number, settled: boolean): void;
  dispose(): void;
}

function defaultVibrate(ms: number): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // Haptics not allowed or unsupported in context
    }
  }
}

/** How close to a whole floor the lift must stand for its hint to show. */
const AT_FLOOR = 0.01;

function actionOf(hit: Object3D): string {
  const action = (hit.userData as Record<string, unknown> | undefined)?.action;
  return action !== undefined ? String(action) : hit.name.replace(/^hit__/, '');
}

export function createHotspotManager(options: HotspotManagerOptions): HotspotManager {
  const { canvas, camera } = options;
  const bus = options.bus ?? defaultBus;
  const vibrate = options.vibrate ?? defaultVibrate;

  const levelHits = new Map<LevelId, readonly Object3D[]>();
  const raycaster = new Raycaster();
  const pointerNdc = new Vector2();

  function toNdc(event: MouseEvent | PointerEvent): boolean {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  }

  function raycastHits(): { hit: Object3D; levelId: LevelId } | null {
    const items: Array<{ mesh: Object3D; levelId: LevelId }> = [];
    for (const [levelId, hits] of levelHits) {
      for (const mesh of hits) {
        items.push({ mesh, levelId });
      }
    }
    if (items.length === 0) return null;

    const meshes = items.map((i) => i.mesh);
    const visibilities = meshes.map((m) => m.visible);

    // Three.js skips raycasting invisible objects, so temporarily enable visibility for the ray check
    for (const m of meshes) m.visible = true;

    try {
      raycaster.setFromCamera(pointerNdc, camera);
      const intersects = raycaster.intersectObjects(meshes, false);
      const first = intersects[0];
      if (!first) return null;

      const closest = first.object;
      const match = items.find((i) => i.mesh === closest);
      if (!match) return null;

      return { hit: closest, levelId: match.levelId };
    } finally {
      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        if (mesh) mesh.visible = visibilities[i] ?? false;
      }
    }
  }

  function trigger(levelId: LevelId, action: string): void {
    vibrate(10);
    bus.emit({ type: 'hotspot:activated', level: levelId, action });
  }

  function handlePointerDown(event: MouseEvent | PointerEvent): boolean {
    if (!toNdc(event)) return false;
    const target = raycastHits();
    if (!target) return false;

    trigger(target.levelId, actionOf(target.hit));
    return true;
  }

  function handlePointerMove(event: MouseEvent | PointerEvent): boolean {
    if (!toNdc(event)) return false;
    const target = raycastHits();
    if (target) {
      canvas.style.cursor = 'pointer';
      return true;
    }
    canvas.style.cursor = '';
    return false;
  }

  const onPointerDown = (ev: PointerEvent) => {
    handlePointerDown(ev);
  };

  const onPointerMove = (ev: PointerEvent) => {
    handlePointerMove(ev);
  };

  canvas.addEventListener?.('pointerdown', onPointerDown as EventListener);
  canvas.addEventListener?.('pointermove', onPointerMove as EventListener);

  const emitHint = createHintEmitter((event) => bus.emit(event));

  function updateHint(position: number, settled: boolean): void {
    const level = LEVEL_IDS[Math.round(position)];
    if (!level) return;
    const action = FLOOR_ACTIONS[level];
    const hit = levelHits.get(level)?.find((h) => actionOf(h) === action);
    const standing = settled && Math.abs(position - Math.round(position)) < AT_FLOOR;
    const point = standing && hit ? projectHint(hit, camera, canvas.getBoundingClientRect()) : null;
    emitHint({ level, action, x: point?.x ?? 0, y: point?.y ?? 0, visible: point !== null });
  }

  function registerLevel(levelId: LevelId, hits: readonly Object3D[]): void {
    levelHits.set(levelId, hits);
  }

  function unregisterLevel(levelId: LevelId): void {
    levelHits.delete(levelId);
  }

  function dispose(): void {
    canvas.removeEventListener?.('pointerdown', onPointerDown as EventListener);
    canvas.removeEventListener?.('pointermove', onPointerMove as EventListener);
    canvas.style.cursor = '';
    levelHits.clear();
  }

  return {
    registerLevel,
    unregisterLevel,
    trigger,
    handlePointerDown,
    handlePointerMove,
    updateHint,
    dispose,
  };
}

/** Registers the hit boxes of every loaded level and drops those of unloaded ones. */
export function syncLevelHits(
  hotspots: Pick<HotspotManager, 'registerLevel' | 'unregisterLevel'>,
  levelIds: readonly LevelId[],
  hitsOf: (index: number) => readonly Object3D[] | undefined,
): void {
  levelIds.forEach((id, index) => {
    const hits = hitsOf(index);
    if (hits) hotspots.registerLevel(id, hits);
    else hotspots.unregisterLevel(id);
  });
}
