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

  it('contain the 4-step workflow process', () => {
    expect(ru.process.steps).toHaveLength(4);
    expect(en.process.steps).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(ru.process.steps[i]?.title).toBeTruthy();
      expect(en.process.steps[i]?.title).toBeTruthy();
      expect(ru.process.steps[i]?.desc).toBeTruthy();
      expect(en.process.steps[i]?.desc).toBeTruthy();
    }
  });

  it('contain team member profiles', () => {
    expect(ru.team.members).toHaveLength(3);
    expect(en.team.members).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(ru.team.members[i]?.name).toBeTruthy();
      expect(en.team.members[i]?.name).toBeTruthy();
      expect(ru.team.members[i]?.role).toBeTruthy();
      expect(en.team.members[i]?.role).toBeTruthy();
    }
  });

  it('contain FAQ questions and answers', () => {
    expect(ru.faq.items.length).toBeGreaterThanOrEqual(4);
    expect(en.faq.items.length).toBe(ru.faq.items.length);
    for (let i = 0; i < ru.faq.items.length; i++) {
      expect(ru.faq.items[i]?.q).toBeTruthy();
      expect(en.faq.items[i]?.q).toBeTruthy();
      expect(ru.faq.items[i]?.a).toBeTruthy();
      expect(en.faq.items[i]?.a).toBeTruthy();
    }
  });

  it('contain case study UI labels', () => {
    expect(ru.cases.heading).toBeTruthy();
    expect(en.cases.heading).toBeTruthy();
    expect(ru.cases.viewCase).toBeTruthy();
    expect(en.cases.viewCase).toBeTruthy();
    expect(ru.cases.backToTower).toBeTruthy();
    expect(en.cases.backToTower).toBeTruthy();
  });

  it('contain legal and privacy links', () => {
    expect(ru.legal.privacy).toBeTruthy();
    expect(en.legal.privacy).toBeTruthy();
    expect(ru.legal.consent).toBeTruthy();
    expect(en.legal.consent).toBeTruthy();
    expect(ru.legal.copyright).toBeTruthy();
    expect(en.legal.copyright).toBeTruthy();
  });
});
