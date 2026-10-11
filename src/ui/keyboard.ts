import { LEVEL_IDS } from '../engine/config';

export function getNextFloorIndex(
  current: number,
  direction: 'up' | 'down',
  total: number,
): number {
  if (direction === 'down') {
    return Math.min(total - 1, current + 1);
  }
  return Math.max(0, current - 1);
}

export function isEditableElement(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function getCurrentFloorIndex(levelIds: readonly string[]): number {
  if (typeof window === 'undefined') return 0;
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const probeY = scrollY + viewportHeight / 3;

  for (let i = levelIds.length - 1; i >= 0; i--) {
    const id = levelIds[i];
    if (!id) continue;
    const el = document.getElementById(id);
    if (el && el.offsetTop <= probeY) {
      return i;
    }
  }

  return 0;
}

export function initKeyboardNavigation(levelIds: readonly string[] = LEVEL_IDS): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (isEditableElement(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'PageDown' || (event.key === 'ArrowDown' && event.shiftKey)) {
      event.preventDefault();
      const current = getCurrentFloorIndex(levelIds);
      const next = getNextFloorIndex(current, 'down', levelIds.length);
      const targetId = levelIds[next];
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (event.key === 'PageUp' || (event.key === 'ArrowUp' && event.shiftKey)) {
      event.preventDefault();
      const current = getCurrentFloorIndex(levelIds);
      const prev = getNextFloorIndex(current, 'up', levelIds.length);
      const targetId = levelIds[prev];
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      const firstId = levelIds[0];
      if (firstId) {
        document.getElementById(firstId)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const lastId = levelIds[levelIds.length - 1];
      if (lastId) {
        document.getElementById(lastId)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
