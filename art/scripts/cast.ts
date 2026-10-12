import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { requireBlender, runBlender } from './blender.ts';
import { CAST_BUDGET, checkCastDocument } from './cast-contract.ts';
import { createIO, optimizeCast } from './optimize.ts';

interface CastSpec {
  clips: string[];
  characters: Array<{ id: string }>;
}

const spec = JSON.parse(readFileSync(join('art', 'cast.json'), 'utf8')) as CastSpec;
const raw = join('art', 'out', 'cast', 'cast.raw.glb');
const glb = join('src', 'assets', 'cast.glb');
mkdirSync(join('art', 'out', 'cast'), { recursive: true });

const started = Date.now();
await runBlender(requireBlender(), ['--python', 'art/blender/build_cast.py', '--', '--out', raw]);
await optimizeCast(raw, glb);

const report = checkCastDocument(await (await createIO()).read(glb));
const bytes = statSync(glb).size;
const problems = [...report.errors];
if (bytes > CAST_BUDGET.maxBytes)
  problems.push(`cast.glb: ${bytes} bytes (max ${CAST_BUDGET.maxBytes})`);
const expected = spec.characters.map((c) => c.id);
if (report.characters.join() !== expected.join()) {
  problems.push(`members ${report.characters.join()} differ from art/cast.json ${expected.join()}`);
}
if ([...report.clips].sort().join() !== [...spec.clips].sort().join()) {
  problems.push(`clips ${report.clips.join()} differ from art/cast.json ${spec.clips.join()}`);
}

console.table({
  members: report.characters.length,
  clips: report.clips.join(' '),
  'max triangles': report.maxTriangles,
  'cast.glb KB': (bytes / 1024).toFixed(1),
  seconds: ((Date.now() - started) / 1000).toFixed(0),
});
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
