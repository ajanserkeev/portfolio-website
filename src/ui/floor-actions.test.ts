import { describe, expect, it } from 'vitest';
import { LEVEL_IDS } from '../engine/config';
import { en } from '../i18n/en';
import { ru } from '../i18n/ru';
import { FLOOR_ACTIONS, NEEDS_3D } from './floor-actions';

describe('FLOOR_ACTIONS', () => {
  it('gives every floor one action with a label in both languages', () => {
    for (const id of LEVEL_IDS) {
      const action = FLOOR_ACTIONS[id];
      expect(ru.actions[action].length).toBeGreaterThan(0);
      expect(en.actions[action].length).toBeGreaterThan(0);
    }
  });

  it('keeps chat and booking usable without WebGL', () => {
    expect(NEEDS_3D.has('open-chat')).toBe(false);
    expect(NEEDS_3D.has('open-booking')).toBe(false);
    expect(NEEDS_3D.has('run-deal')).toBe(true);
  });
});
