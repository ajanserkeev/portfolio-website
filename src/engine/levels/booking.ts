import type { Object3D } from 'three';
import { bus as defaultBus, type TowerBus } from '../events';
import { TweenManager } from '../tween';

export interface BookingControllerOptions {
  root: Object3D;
  bus?: TowerBus;
  onRowsChange?: (rows: readonly string[]) => void;
}

export interface BookingController {
  readonly rows: readonly string[];
  readonly isFlipping: boolean;
  setSlot(slotIso: string, currentTimeSec?: number): void;
  flipTo(newRows: readonly string[], currentTimeSec?: number): void;
  update(timeSec: number): void;
  dispose(): void;
}

const DEFAULT_ROWS: readonly string[] = [
  'SCHEDULE: TODAY',
  '10:00 AVAILABLE',
  '14:00 AVAILABLE',
  '17:00 AVAILABLE',
];

function formatSlotRows(slotIso: string): string[] {
  try {
    const date = new Date(slotIso);
    if (!Number.isNaN(date.getTime())) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const day = date.getDate();
      const monthNames = [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
      ];
      const month = monthNames[date.getMonth()] ?? 'OCT';
      return [`BOOKED: ${hours}:${minutes}`, `DATE: ${day} ${month}`, 'STATUS: CONFIRMED'];
    }
  } catch {
    // fallback
  }
  const fallbackTime = slotIso.includes('T') ? slotIso.slice(11, 16) : slotIso;
  return [`BOOKED: ${fallbackTime || '14:00'}`, 'STATUS: CONFIRMED'];
}

export function createBookingController(options: BookingControllerOptions): BookingController {
  const { root } = options;
  const bus = options.bus ?? defaultBus;
  const onRowsChange = options.onRowsChange;

  const flap = root.getObjectByName('dyn__board__flap') ?? root.getObjectByName('dyn__board');

  const tweens = new TweenManager();

  let currentRows: readonly string[] = [...DEFAULT_ROWS];
  let isFlipping = false;
  let lastTimeSec: number | undefined;

  function flipTo(newRows: readonly string[], currentTimeSec = 0): void {
    isFlipping = true;
    tweens.stopAll();

    tweens.add(
      {
        from: 0,
        to: Math.PI * 4,
        durationSec: 0.9,
        ease: 'easeOutQuad',
        onUpdate: (angle) => {
          if (flap) {
            flap.rotation.x = Math.sin(angle * 3) * 0.45;
          }
        },
        onComplete: () => {
          if (flap) {
            flap.rotation.x = 0;
          }
          currentRows = [...newRows];
          isFlipping = false;
          onRowsChange?.(currentRows);
        },
      },
      currentTimeSec,
    );
  }

  function setSlot(slotIso: string, currentTimeSec = 0): void {
    const formatted = formatSlotRows(slotIso);
    flipTo(formatted, currentTimeSec);
  }

  const unbindBooking = bus.on('booking:confirmed', (e) => {
    setSlot(e.slotIso, lastTimeSec ?? 0);
  });

  const unbindHotspot = bus.on('hotspot:activated', (e) => {
    if (e.level === 'booking') {
      flipTo(['RECEPTION DESK', 'ONLINE BOOKING', 'SELECT A SLOT'], lastTimeSec ?? 0);
    }
  });

  function update(timeSec: number): void {
    lastTimeSec = timeSec;
    tweens.update(timeSec);
  }

  function dispose(): void {
    unbindBooking();
    unbindHotspot();
    tweens.stopAll();
  }

  return {
    get rows() {
      return currentRows;
    },
    get isFlipping() {
      return isFlipping;
    },
    setSlot,
    flipTo,
    update,
    dispose,
  };
}
