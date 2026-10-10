import type { LevelId } from '../engine/config';
import { bus as defaultBus, type PainId, type TowerBus } from '../engine/events';
import { getStoredPain, isPainId, relevantLevels, setStoredPain } from '../engine/relevance';

export interface PainPickerOptions {
  container?: ParentNode;
  bus?: TowerBus;
  onSelect?: (pain: PainId) => void;
}

export function initPainPicker(options: PainPickerOptions = {}): () => void {
  const root = options.container ?? (typeof document !== 'undefined' ? document : null);
  if (!root) return () => {};

  const bus = options.bus ?? defaultBus;

  function updateDom(selectedPain: PainId | null): void {
    const buttons = root?.querySelectorAll?.('[data-pain-option]') ?? [];
    for (const btn of buttons) {
      const option = (btn as HTMLElement).getAttribute('data-pain-option');
      if (option === selectedPain) {
        (btn as HTMLElement).setAttribute('aria-pressed', 'true');
      } else {
        (btn as HTMLElement).setAttribute('aria-pressed', 'false');
      }
    }

    const relevant = selectedPain ? new Set(relevantLevels(selectedPain)) : new Set<LevelId>();
    const sections = root?.querySelectorAll?.('section[data-level]') ?? [];
    for (const section of sections) {
      const levelId = (section as HTMLElement).getAttribute('data-level') as LevelId | null;
      if (levelId && relevant.has(levelId)) {
        (section as HTMLElement).setAttribute('data-relevant', 'true');
      } else {
        (section as HTMLElement).removeAttribute('data-relevant');
      }
    }
  }

  function selectPain(pain: PainId): void {
    setStoredPain(pain);
    updateDom(pain);
    options.onSelect?.(pain);
    bus.emit({ type: 'capsule:selected', pain });
  }

  const initial = getStoredPain();
  if (initial) {
    updateDom(initial);
  }

  const handleClick = (e: Event): void => {
    const target = e.target as HTMLElement | null;
    const button = target?.closest?.('[data-pain-option]');
    if (!button) return;

    const raw = (button as HTMLElement).getAttribute('data-pain-option');
    if (isPainId(raw)) {
      selectPain(raw);
    }
  };

  root.addEventListener?.('click', handleClick);

  return () => {
    root.removeEventListener?.('click', handleClick);
  };
}
