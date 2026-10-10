import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { packAtlas } from './atlas.ts';

const DIR = join('art', 'screens');
const OUT = join('src', 'assets', 'textures');

function sizeOf(file: string): { width: number; height: number } {
  const match = readFileSync(join(DIR, file), 'utf8').match(
    /<meta name="screen-size" content="(\d+)x(\d+)">/,
  );
  if (!match) throw new Error(`${file}: add <meta name="screen-size" content="WxH">`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

const items = readdirSync(DIR)
  .filter((file) => file.endsWith('.html'))
  .sort()
  .map((file) => ({ id: file.replace(/\.html$/, ''), ...sizeOf(file) }));
const layout = packAtlas(items, 2048, 8);
const rect = (id: string) => {
  const found = layout.rects[id];
  if (!found) throw new Error(`no atlas rect for ${id}`);
  return found;
};

const browser = await chromium.launch();
const shots = new Map<string, Buffer>();
for (const item of items) {
  const page = await browser.newPage({
    viewport: { width: item.width, height: item.height },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(join(DIR, `${item.id}.html`)).href);
  shots.set(item.id, await page.screenshot({ type: 'png' }));
  await page.close();
}
await browser.close();

const shot = (id: string) => {
  const buffer = shots.get(id);
  if (!buffer) throw new Error(`no screenshot for ${id}`);
  return buffer;
};

mkdirSync(OUT, { recursive: true });
await sharp({
  create: { width: layout.width, height: layout.height, channels: 3, background: '#101218' },
})
  .composite(
    items.map((item) => ({ input: shot(item.id), left: rect(item.id).x, top: rect(item.id).y })),
  )
  .webp({ quality: 90 })
  .toFile(join(OUT, 'screens.webp'));

async function glow(id: string): Promise<string> {
  const { channels } = await sharp(shot(id)).stats();
  return `#${channels
    .slice(0, 3)
    .map((channel) => Math.round(channel.mean).toString(16).padStart(2, '0'))
    .join('')}`;
}

const screens: Record<string, unknown> = {};
for (const item of items) screens[item.id] = { ...rect(item.id), glow: await glow(item.id) };
writeFileSync(
  join(DIR, 'manifest.json'),
  `${JSON.stringify({ width: layout.width, height: layout.height, screens }, null, 2)}\n`,
);
console.log(`screens atlas ${layout.width}x${layout.height}, ${items.length} screens`);
