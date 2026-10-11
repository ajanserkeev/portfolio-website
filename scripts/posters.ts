// Renders floor posters and the OG image from the live scene.
// Needs a running preview: `pnpm build && pnpm preview`, then `pnpm posters [baseUrl]`.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { LEVEL_IDS } from '../src/engine/config';
import { centerCrop, posterJobs } from './posters-lib';

const base = process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:4321';
// Captured at twice the density, so the zoomed crop stays sharp.
const SCALE = 2;

const browser = await chromium.launch({
  // SwiftShader gives headless Chromium a software WebGL2 implementation.
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  for (const job of posterJobs(base, LEVEL_IDS)) {
    const viewport = { width: job.width, height: job.height };
    const page = await browser.newPage({ viewport, deviceScaleFactor: SCALE });
    await page.goto(job.url);
    await page.waitForSelector('html[data-shot-ready="true"]', {
      state: 'attached',
      timeout: 60_000,
    });
    const png = await page.screenshot();
    await page.close();
    mkdirSync(dirname(job.out), { recursive: true });
    const image = sharp(png)
      .extract(centerCrop(viewport, SCALE, job.zoom))
      .resize(job.width, job.height);
    await (job.format === 'webp'
      ? image.webp({ quality: 80 })
      : image.jpeg({ quality: 86 })
    ).toFile(job.out);
    console.log(`${job.out} ← ${job.url}`);
  }
} finally {
  await browser.close();
}
