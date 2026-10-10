import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredPain, getStoredPain, relevantLevels, setStoredPain } from './relevance';

describe('relevance', () => {
  beforeEach(() => {
    // In node test environment, globalThis.sessionStorage might be undefined or mockable
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
    clearStoredPain();
  });

  it('maps pain to relevant level IDs', () => {
    expect(relevantLevels('lost-leads')).toEqual(['agents', 'crm']);
    expect(relevantLevels('manual-routine')).toEqual(['crm', 'agents']);
    expect(relevantLevels('need-site')).toEqual(['workshop']);
    expect(relevantLevels('need-booking')).toEqual(['booking']);
    expect(relevantLevels('browsing')).toEqual([]);
  });

  it('persists and restores selected pain in sessionStorage safely', () => {
    expect(getStoredPain()).toBeNull();

    setStoredPain('lost-leads');
    expect(getStoredPain()).toBe('lost-leads');

    setStoredPain('need-booking');
    expect(getStoredPain()).toBe('need-booking');

    clearStoredPain();
    expect(getStoredPain()).toBeNull();
  });

  it('handles sessionStorage being unavailable or throwing', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: () => {
          throw new Error('Denied');
        },
        setItem: () => {
          throw new Error('QuotaExceeded');
        },
        removeItem: () => {
          throw new Error('Denied');
        },
      },
      configurable: true,
      writable: true,
    });

    expect(() => setStoredPain('lost-leads')).not.toThrow();
    expect(getStoredPain()).toBeNull();
    expect(() => clearStoredPain()).not.toThrow();
  });
});
