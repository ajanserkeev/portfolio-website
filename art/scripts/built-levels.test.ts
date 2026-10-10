import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
  }
});
