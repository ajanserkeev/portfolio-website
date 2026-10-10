import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  ShaderMaterial,
  Texture,
} from 'three';
import { describe, expect, it } from 'vitest';
import { prepareLevel } from './glb-level';
import { createSharedMaterials } from './materials/shared';

function tree() {
  const root = new Group();
  const add = (name: string, mesh = true) => {
    const node = mesh ? new Mesh(new BoxGeometry(), new MeshBasicMaterial()) : new Object3D();
    node.name = name;
    root.add(node);
    return node;
  };
  for (const n of [
    'static',
    'screens',
    'glow',
    'dyn__op-1__head',
    'dyn__op-1__face',
    'hit__phone',
  ]) {
    add(n);
  }
  add('anchor__capsule-in', false);
  return root;
}

describe('prepareLevel', () => {
  const shared = createSharedMaterials({
    matcap: new Texture(),
    screens: new Texture(),
    faces: new Texture(),
  });
  const baked = new ShaderMaterial();

  it('assigns materials by node name', () => {
    const root = tree();
    prepareLevel(root, baked, shared);
    const material = (name: string) => (root.getObjectByName(name) as Mesh).material;
    expect(material('static')).toBe(baked);
    expect(material('screens')).toBe(shared.screens);
    expect(material('glow')).toBe(shared.glow);
    expect(material('dyn__op-1__head')).toBe(shared.matcap);
    expect(material('dyn__op-1__face')).toBe(shared.faces);
  });

  it('collects anchors without their prefix and hides hit boxes', () => {
    const root = tree();
    const { anchors, hits } = prepareLevel(root, baked, shared);
    expect(anchors.get('capsule-in')?.name).toBe('anchor__capsule-in');
    expect(hits.map((h) => h.name)).toEqual(['hit__phone']);
    expect(hits[0]?.visible).toBe(false);
  });
});
