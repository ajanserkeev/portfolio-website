import { readFileSync, writeFileSync } from 'node:fs';
import { cameraPose } from '../src/engine/camera-path.ts';
import type { TowerConfig } from '../src/engine/config.ts';
import { computeFraming } from '../src/engine/framing.ts';

const tower = JSON.parse(readFileSync('scene/tower.json', 'utf8')) as TowerConfig;
const viewports = [
  { width: 900, height: 1200 },
  { width: 1440, height: 900 },
];
const lifts = [0, 1, 2.5];

const cases = viewports.flatMap((viewport) =>
  lifts.map((lift) => {
    const pose = cameraPose(lift, computeFraming(viewport, tower.camera, tower.level), tower);
    return { viewport, lift, position: pose.position, target: pose.target };
  }),
);
writeFileSync('scene/camera-fixtures.json', `${JSON.stringify({ cases }, null, 2)}\n`);
console.log(`wrote ${cases.length} camera fixtures`);
