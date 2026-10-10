import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { requireBlender, runBlender } from './blender.ts';

const png = join('art', 'out', 'matcap.png');
mkdirSync(join('art', 'out'), { recursive: true });
await runBlender(requireBlender(), [
  '--python',
  'art/blender/render_matcap.py',
  '--',
  '--out',
  png,
]);
await sharp(png)
  .webp({ quality: 95 })
  .toFile(join('src', 'assets', 'textures', 'matcap.webp'));
console.log('matcap: src/assets/textures/matcap.webp');
