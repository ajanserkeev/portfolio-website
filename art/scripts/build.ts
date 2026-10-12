import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { requireBlender, runBlender } from './blender.ts';
import { parseBuildArgs } from './build-args.ts';
import { checkBudgets, checkCastSlots, checkLevelDocument } from './level-contract.ts';
import { createIO, encodeLightmap, optimizeLevel } from './optimize.ts';

const args = parseBuildArgs(process.argv.slice(2));
const tower = JSON.parse(readFileSync(join('scene', 'tower.json'), 'utf8')) as {
  levels: Array<{ id: string }>;
};
const shipped = tower.levels.some((level) => level.id === args.level);
const work = join('art', 'out', args.level);
const target = shipped ? join('src', 'assets', 'levels') : join(work, 'final');
mkdirSync(target, { recursive: true });

const started = Date.now();
await runBlender(requireBlender(), [
  '--python',
  'art/blender/build_level.py',
  '--',
  '--level',
  args.level,
  '--out',
  work,
  '--samples',
  args.draft ? '64' : '512',
  ...(args.noBake ? ['--no-bake'] : []),
]);

const glb = join(target, `${args.level}.glb`);
const lightmap = join(target, `${args.level}.lightmap.webp`);
await optimizeLevel(join(work, `${args.level}.raw.glb`), glb);
await encodeLightmap(join(work, `${args.level}.lightmap.png`), lightmap);

const document = await (await createIO()).read(glb);
const report = checkLevelDocument(document);
const cast = JSON.parse(readFileSync(join('art', 'cast.json'), 'utf8')) as {
  clips: string[];
  characters: Array<{ id: string }>;
};
const castNames = { characters: cast.characters.map((c) => c.id), clips: cast.clips };
const sizes = { glb: statSync(glb).size, lightmap: statSync(lightmap).size };
const problems = [
  ...report.errors,
  ...checkBudgets(report, sizes),
  ...checkCastSlots(document, castNames),
];
const hash = createHash('sha256').update(readFileSync(glb)).digest('hex').slice(0, 16);

console.table({
  level: args.level,
  shipped,
  triangles: report.triangles,
  'glb KB': (sizes.glb / 1024).toFixed(1),
  'lightmap KB': (sizes.lightmap / 1024).toFixed(1),
  'glb sha256': hash,
  seconds: ((Date.now() - started) / 1000).toFixed(0),
});
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
