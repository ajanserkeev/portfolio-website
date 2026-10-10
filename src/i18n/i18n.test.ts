import { describe, expect, it } from 'vitest';
import { LEVEL_IDS } from '../engine/config';
import { en } from './en';
import { ru } from './ru';

function leaves(value: unknown, prefix = ''): Array<[string, unknown]> {
  if (typeof value !== 'object' || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('dictionaries', () => {
  it('have identical keys in ru and en', () => {
    const keys = (d: unknown) =>
      leaves(d)
        .map(([key]) => key)
        .sort();
    expect(keys(en)).toEqual(keys(ru));
  });

  it('contain only non-empty strings', () => {
    for (const d of [ru, en]) {
      for (const [key, value] of leaves(d)) {
        expect(typeof value, key).toBe('string');
        expect((value as string).trim(), key).not.toBe('');
      }
    }
  });

  it('describe every level of the tower', () => {
    for (const id of LEVEL_IDS) {
      expect(ru.levels[id].title).toBeTruthy();
      expect(en.levels[id].title).toBeTruthy();
    }
  });
});
