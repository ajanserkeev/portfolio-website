import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FLOOR_ACTIONS } from '../../src/ui/floor-actions';
import { CAST_BUDGET, checkCastDocument } from './cast-contract';
import { checkBudgets, checkLevelDocument } from './level-contract';
import { createIO } from './optimize';

const DIR = join('src', 'assets', 'levels');
const levels = (() => {
  try {
    return readdirSync(DIR).filter((file) => file.endsWith('.glb'));
  } catch {
    return [];
  }
})();

describe.skipIf(levels.length === 0)('built levels in src/assets/levels', () => {
  for (const file of levels) {
    it(`${file} follows the contract and fits the budget`, async () => {
      const doc = await (await createIO()).read(join(DIR, file));
      const report = checkLevelDocument(doc);
      expect(report.errors).toEqual([]);
      const lightmap = join(DIR, file.replace(/\.glb$/, '.lightmap.webp'));
      expect(
        checkBudgets(report, {
          glb: statSync(join(DIR, file)).size,
          lightmap: statSync(lightmap).size,
        }),
      ).toEqual([]);
    });

    const id = file.replace(/\.glb$/, '');
    if (id in FLOOR_ACTIONS) {
      const action = FLOOR_ACTIONS[id as keyof typeof FLOOR_ACTIONS];
      it(`${file} has a hit box for its DOM action "${action}"`, async () => {
        const doc = await (await createIO()).read(join(DIR, file));
        const actions = doc
          .getRoot()
          .listNodes()
          .filter((node) => node.getName().startsWith('hit__'))
          .map((node) => (node.getExtras() as { action?: string }).action);
        expect(actions).toContain(action);
      });
    }
  }
});

const CAST = join('src', 'assets', 'cast.glb');

describe.skipIf(!existsSync(CAST))('built cast in src/assets/cast.glb', () => {
  it('follows the cast contract, fits the budget and matches art/cast.json', async () => {
    const spec = JSON.parse(readFileSync(join('art', 'cast.json'), 'utf8')) as {
      clips: string[];
      characters: Array<{ id: string }>;
    };
    const report = checkCastDocument(await (await createIO()).read(CAST));
    expect(report.errors).toEqual([]);
    expect(statSync(CAST).size).toBeLessThanOrEqual(CAST_BUDGET.maxBytes);
    expect(report.characters).toEqual(spec.characters.map((c) => c.id));
    expect([...report.clips].sort()).toEqual([...spec.clips].sort());
  });
});
