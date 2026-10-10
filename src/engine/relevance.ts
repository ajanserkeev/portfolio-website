import type { LevelId } from './config';
import type { PainId } from './events';

const STORAGE_KEY = 'tower_pain';

const PAIN_LEVELS: Record<PainId, readonly LevelId[]> = {
  'lost-leads': ['agents', 'crm'],
  'manual-routine': ['crm', 'agents'],
  'need-site': ['workshop'],
  'need-booking': ['booking'],
  browsing: [],
};

export const ALL_PAINS: readonly PainId[] = [
  'lost-leads',
  'manual-routine',
  'need-site',
  'need-booking',
  'browsing',
];

export function isPainId(val: unknown): val is PainId {
  return typeof val === 'string' && ALL_PAINS.includes(val as PainId);
}

export function relevantLevels(pain: PainId): readonly LevelId[] {
  return PAIN_LEVELS[pain] ?? [];
}

export function getStoredPain(): PainId | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const value = sessionStorage.getItem(STORAGE_KEY);
    return isPainId(value) ? value : null;
  } catch {
    return null;
  }
}

export function setStoredPain(pain: PainId): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, pain);
  } catch {
    // Storage access might be denied in private mode or full
  }
}

export function clearStoredPain(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage access might be denied
  }
}
