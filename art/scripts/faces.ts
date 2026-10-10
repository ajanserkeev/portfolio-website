import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { FACE_FRAMES, FACE_GRID } from '../../src/engine/actors/faces.ts';
import { faceSvg } from './faces-lib.ts';

const { cols, rows, cell } = FACE_GRID;
mkdirSync(join('src', 'assets', 'textures'), { recursive: true });
mkdirSync(join('art', 'faces'), { recursive: true });

const cells = await Promise.all(
  FACE_FRAMES.map(async (frame, index) => ({
    input: await sharp(Buffer.from(faceSvg(frame)))
      .png()
      .toBuffer(),
    left: (index % cols) * cell,
    top: Math.floor(index / cols) * cell,
  })),
);
await sharp({
  create: { width: cols * cell, height: rows * cell, channels: 3, background: '#15181f' },
})
  .composite(cells)
  .webp({ lossless: true })
  .toFile(join('src', 'assets', 'textures', 'faces.webp'));
writeFileSync(
  join('art', 'faces', 'manifest.json'),
  `${JSON.stringify({ cols, rows, cell, frames: FACE_FRAMES }, null, 2)}\n`,
);
console.log(`faces atlas ${cols * cell}x${rows * cell}`);
