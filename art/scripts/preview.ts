import { join } from 'node:path';
import { requireBlender, runBlender } from './blender.ts';

const level = process.argv[2] ?? 'test-room';
const out = join('art', 'out', level, 'preview.png');
await runBlender(requireBlender(), [
  '--python',
  'art/blender/render_preview.py',
  '--',
  '--level',
  level,
  '--out',
  out,
  '--width',
  process.argv[3] ?? '900',
  '--height',
  process.argv[4] ?? '1200',
]);
console.log(`preview: ${out}`);
