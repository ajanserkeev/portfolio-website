import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { requireBlender, runBlender } from './blender.ts';
import { gridLuminanceDiff, type RawImage } from './compare-lib.ts';

const level = process.argv[2] ?? 'agents';
const base = process.env.BASE_URL ?? 'http://localhost:4321';
const width = 900;
const height = 1200;
const dir = join('art', 'out', level);
mkdirSync(dir, { recursive: true });
const preview = join(dir, 'preview.png');
const site = join(dir, 'site.png');

await runBlender(requireBlender(), [
  '--python',
  'art/blender/render_preview.py',
  '--',
  '--level',
  level,
  '--out',
  preview,
  '--width',
  String(width),
  '--height',
  String(height),
]);

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(`${base}/?shot=${level}`);
await page.waitForSelector('html[data-shot-ready="true"]', { state: 'attached', timeout: 60_000 });
await page.screenshot({ path: site });
await browser.close();

const raw = async (path: string): Promise<RawImage> => {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
};
const diffs = gridLuminanceDiff(await raw(preview), await raw(site));
await sharp({ create: { width: width * 2, height, channels: 3, background: '#000000' } })
  .composite([
    { input: preview, left: 0, top: 0 },
    { input: site, left: width, top: 0 },
  ])
  .png()
  .toFile(join(dir, 'compare.png'));

const within = diffs.filter((d) => d <= 0.08).length;
console.log(diffs.map((d) => `${(d * 100).toFixed(1)}%`).join('  '));
console.log(
  `${within}/9 cells within 8% → ${within >= 7 ? 'OK' : 'NEEDS CALIBRATION'}; see ${join(dir, 'compare.png')}`,
);
process.exitCode = within >= 7 ? 0 : 1;
