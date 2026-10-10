import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import raw from '../../scene/tower.json';
import { LEVEL_IDS, levelBaseY, levelIndex, tower } from './config';

const fraction = z.number().gt(0).lt(1);
const frameRule = z.object({
  fitWidth: z.number().gt(0).lte(1),
  centerX: fraction,
  centerY: fraction,
  minVisibleHeight: z.number().positive().optional(),
});
const schema = z.object({
  version: z.literal(1),
  level: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive(),
    slab: z.number().positive(),
  }),
  levels: z
    .array(z.object({ id: z.enum(LEVEL_IDS), kind: z.enum(['roof', 'floor', 'basement']) }))
    .length(LEVEL_IDS.length),
  camera: z.object({
    fovDeg: z.number().min(10).max(90),
    pitchDeg: z.number().min(0).max(60),
    yawDeg: z.number().min(-60).max(60),
    targetHeight: z.number().positive(),
    travelBulge: z.number().min(0).max(0.5),
    portrait: frameRule,
    landscape: frameRule,
  }),
  tube: z.object({ x: z.number(), z: z.number(), radius: z.number().positive() }),
});

describe('scene/tower.json', () => {
  it('matches the schema', () => {
    expect(() => schema.parse(raw)).not.toThrow();
  });

  it('lists levels from the roof down in canonical order', () => {
    expect(tower.levels.map((level) => level.id)).toEqual([...LEVEL_IDS]);
  });

  it('starts with the roof and ends with the basement', () => {
    expect(tower.levels[0]?.kind).toBe('roof');
    expect(tower.levels.at(-1)?.kind).toBe('basement');
  });

  it('keeps the slab much thinner than a level', () => {
    expect(tower.level.slab).toBeLessThan(tower.level.height / 4);
  });
});

describe('level helpers', () => {
  it('finds level indices by id', () => {
    expect(levelIndex('roof')).toBe(0);
    expect(levelIndex('crm')).toBe(2);
    expect(levelIndex('basement')).toBe(5);
  });

  it('puts each level one level-height below the previous one', () => {
    expect(levelBaseY(0)).toBe(0);
    expect(levelBaseY(2)).toBe(-2 * tower.level.height);
  });
});
