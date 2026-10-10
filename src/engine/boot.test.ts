import { describe, expect, it } from 'vitest';
import { readStoredMode, resolveOverride, writeStoredMode } from './boot';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const blocked = {
  getItem(): string | null {
    throw new Error('SecurityError');
  },
  setItem(): void {
    throw new Error('QuotaExceededError');
  },
  removeItem(): void {
    throw new Error('SecurityError');
  },
};

describe('stored mode', () => {
  it('remembers both choices', () => {
    const storage = memoryStorage();
    writeStoredMode(storage, 'static');
    expect(readStoredMode(storage)).toBe('static');
    writeStoredMode(storage, 'live');
    expect(readStoredMode(storage)).toBe('live');
  });

  it('ignores unknown stored values', () => {
    const storage = memoryStorage();
    storage.setItem('tower:mode', 'turbo');
    expect(readStoredMode(storage)).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    expect(readStoredMode(blocked)).toBeNull();
    expect(() => writeStoredMode(blocked, 'static')).not.toThrow();
  });

  it('treats missing storage as no choice', () => {
    expect(readStoredMode(null)).toBeNull();
    expect(() => writeStoredMode(null, 'live')).not.toThrow();
  });
});

describe('resolveOverride', () => {
  it('lets the URL win over the stored choice', () => {
    expect(resolveOverride('lite', 'static', 'high')).toBe('lite');
  });

  it('applies a stored static choice', () => {
    expect(resolveOverride(null, 'static', 'high')).toBe('static');
  });

  it('turns a stored live choice into lite only where the device would go static', () => {
    expect(resolveOverride(null, 'live', 'static')).toBe('lite');
    expect(resolveOverride(null, 'live', 'high')).toBeNull();
  });

  it('returns null without any choice', () => {
    expect(resolveOverride(null, null, 'lite')).toBeNull();
  });
});
