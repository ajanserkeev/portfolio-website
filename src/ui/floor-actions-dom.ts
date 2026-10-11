import type { LevelId } from '../engine/config';
import { bus as defaultBus, type TowerBus } from '../engine/events';

export interface FloorActionsOptions {
  bus?: TowerBus;
  vibrate?: (ms: number) => void;
}

function haptic(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Vibration is optional and may be blocked in embedded browsers.
  }
}

/**
 * DOM twins of the 3D hotspots: one click = one hotspot:activated, with or without WebGL.
 * The engine only raycasts the canvas, so a button never fires twice.
 */
export function initFloorActions(doc: Document, options: FloorActionsOptions = {}): () => void {
  const bus = options.bus ?? defaultBus;
  const vibrate = options.vibrate ?? haptic;

  const onClick = (event: Event) => {
    const button = (event.target as Element | null)?.closest?.('button[data-hotspot][data-level]');
    const level = button?.getAttribute('data-level') as LevelId | null | undefined;
    const action = button?.getAttribute('data-hotspot');
    if (!level || !action) return;
    vibrate(10);
    bus.emit({ type: 'hotspot:activated', level, action });
  };

  const offBooking = bus.on('hotspot:activated', (e) => {
    if (e.action !== 'open-booking') return;
    doc
      .querySelector('#booking .level__widget')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  doc.addEventListener('click', onClick);
  return () => {
    doc.removeEventListener('click', onClick);
    offBooking();
  };
}
