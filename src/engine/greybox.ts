import {
  BoxGeometry,
  type BufferGeometry,
  Group,
  type Material,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from 'three';
import { levelBaseY, type TowerConfig, tower } from './config';
import { disposeObject3D, type LevelAsset, type LevelSource } from './level-asset';

const ACCENTS = ['#f2b33d', '#1fa59a', '#ff5a1f', '#2aabee', '#c9a15b', '#6e6258'] as const;

/** Placeholder level made of boxes: same footprint as the real level, no assets needed. */
export function buildGreyboxLevel(index: number, cfg: TowerConfig = tower): LevelAsset {
  const level = cfg.levels[index];
  if (!level) throw new Error(`No level at index ${index}`);
  const { width, depth, height, slab } = cfg.level;
  const root = new Group();
  root.name = `level.${level.id}`;
  root.position.y = levelBaseY(index, cfg);

  const shell = new MeshLambertMaterial({ color: '#e4d6bf' });
  const floor = new MeshLambertMaterial({ color: '#6e6258' });
  const accent = new MeshLambertMaterial({ color: ACCENTS[index % ACCENTS.length] });
  const add = (
    geometry: BufferGeometry,
    material: Material,
    name: string,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    root.add(mesh);
  };

  const wall = height - slab;
  add(new BoxGeometry(width, slab, depth), floor, 'greybox.floor', 0, -slab / 2, 0);
  if (level.kind !== 'roof') {
    add(new BoxGeometry(width, wall, 0.2), shell, 'greybox.back', 0, wall / 2, -depth / 2 + 0.1);
    add(new BoxGeometry(0.2, wall, depth), shell, 'greybox.left', -width / 2 + 0.1, wall / 2, 0);
    add(new BoxGeometry(0.2, wall, depth), shell, 'greybox.right', width / 2 - 0.1, wall / 2, 0);
  }
  [-3.5, 0, 3.5].forEach((x, i) => {
    add(
      new BoxGeometry(2, 0.9, 1.1),
      accent,
      `greybox.station.${i}`,
      x,
      0.45,
      -0.8 + (i % 2) * 0.6,
    );
  });

  const anchors = new Map<string, Object3D>();
  return { root, anchors, hits: [], dispose: () => disposeObject3D(root) };
}

export const greyboxSource: LevelSource = async (index) => buildGreyboxLevel(index);
