import { requireBlender, runBlender } from './blender.ts';

await runBlender(requireBlender(), [
  '--python',
  'art/tests/blender/run.py',
  '--',
  ...process.argv.slice(2),
]);
