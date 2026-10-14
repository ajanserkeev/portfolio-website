import type { LevelId } from '../engine/config';
import { bus as defaultBus, type TowerBus } from '../engine/events';

/** What the engine reports (`hint:moved`) when the current floor's main object moves on screen. */
export interface HintPosition {
  level: LevelId;
  action: string;
  /** CSS pixels in the viewport. */
  x: number;
  y: number;
  /** False while the lift is moving or the floor is not loaded. */
  visible: boolean;
}

export interface PinView {
  used: ReadonlySet<string>;
  /** The object is under a text card, the dock or the lift panel. */
  covered: boolean;
  width: number;
  height: number;
}

/** Whether to show the hint chip and where its tip points. */
export function decidePin(
  hint: HintPosition,
  view: PinView,
): { show: boolean; x: number; y: number } {
  const onScreen = hint.x >= 0 && hint.y >= 0 && hint.x <= view.width && hint.y <= view.height;
  const show = hint.visible && onScreen && !view.covered && !view.used.has(hint.action);
  return { show, x: hint.x, y: hint.y };
}

interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'tower:hints-used';

export function readUsedHints(storage: SessionStore | null): Set<string> {
  try {
    const raw = storage?.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

export function rememberHint(storage: SessionStore | null, action: string): void {
  try {
    const used = readUsedHints(storage);
    used.add(action);
    storage?.setItem(KEY, JSON.stringify([...used]));
  } catch {
    // Private mode or blocked storage: the hint just shows again next visit.
  }
}

function sessionStore(): SessionStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const COVERS = '.level__content, .hero__more, .dock, .elevator, .topbar, .chat';

/**
 * The hint chip over the current floor's main object. It is a pointer shortcut only: the button in
 * the floor's text is its accessible twin, so the chip is hidden from assistive tech.
 */
export function initPins(doc: Document, bus: TowerBus = defaultBus): () => void {
  const layer = doc.querySelector<HTMLElement>('[data-pins]');
  if (!layer) return () => {};
  const labels = JSON.parse(layer.dataset.labels ?? '{}') as Record<string, string>;
  const chip = doc.createElement('button');
  chip.type = 'button';
  chip.className = 'pin';
  chip.tabIndex = -1;
  chip.setAttribute('aria-hidden', 'true');
  chip.hidden = true;
  const dot = doc.createElement('span');
  dot.className = 'pin__dot';
  const label = doc.createElement('span');
  chip.append(dot, label);
  layer.append(chip);
  const storage = sessionStore();
  let current: HintPosition | null = null;

  const render = () => {
    if (!current) return;
    // The topmost element at the object's point, other than the chip itself.
    const top = doc.elementsFromPoint(current.x, current.y).find((el) => !layer.contains(el));
    const covered = !!top?.closest(COVERS);
    const view = doc.defaultView;
    const decision = decidePin(current, {
      used: readUsedHints(storage),
      covered,
      width: view?.innerWidth ?? 0,
      height: view?.innerHeight ?? 0,
    });
    chip.hidden = !decision.show || !labels[current.action];
    if (chip.hidden) return;
    label.textContent = labels[current.action] ?? '';
    chip.style.setProperty('--pin-x', `${decision.x}px`);
    chip.style.setProperty('--pin-y', `${decision.y}px`);
  };

  const offs = [
    bus.on('hint:moved', (event) => {
      current = event;
      render();
    }),
    bus.on('hotspot:activated', (event) => {
      rememberHint(storage, event.action);
      render();
    }),
  ];
  const onScroll = () => render();
  doc.defaultView?.addEventListener('scroll', onScroll, { passive: true });
  chip.addEventListener('click', () => {
    if (current)
      bus.emit({ type: 'hotspot:activated', level: current.level, action: current.action });
  });
  return () => {
    for (const off of offs) off();
    doc.defaultView?.removeEventListener('scroll', onScroll);
    chip.remove();
  };
}
