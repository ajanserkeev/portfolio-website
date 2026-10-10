import { Document } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { checkBudgets, checkLevelDocument, DEFAULT_LEVEL_BUDGET } from './level-contract';

type Attr = 'POSITION' | 'NORMAL' | 'COLOR_0' | 'TEXCOORD_0';
const SIZES: Record<Attr, [type: 'VEC2' | 'VEC3' | 'VEC4', count: number]> = {
  POSITION: ['VEC3', 9],
  NORMAL: ['VEC3', 9],
  COLOR_0: ['VEC4', 12],
  TEXCOORD_0: ['VEC2', 6],
};

function level(nodes: Array<[name: string, attrs: Attr[]]>): Document {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  for (const [name, attrs] of nodes) {
    const prim = doc.createPrimitive();
    for (const attr of attrs) {
      const [type, count] = SIZES[attr];
      prim.setAttribute(
        attr,
        doc.createAccessor().setType(type).setArray(new Float32Array(count)).setBuffer(buffer),
      );
    }
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  }
  return doc;
}

const VALID: Array<[string, Attr[]]> = [
  ['static', ['POSITION', 'COLOR_0', 'TEXCOORD_0']],
  ['screens', ['POSITION', 'TEXCOORD_0']],
  ['glow', ['POSITION', 'COLOR_0']],
  ['dyn__op-1__head', ['POSITION', 'NORMAL', 'COLOR_0']],
  ['dyn__op-1__face', ['POSITION', 'NORMAL', 'TEXCOORD_0']],
  ['hit__phone', ['POSITION']],
];

describe('checkLevelDocument', () => {
  it('accepts a level that follows the contract', () => {
    const report = checkLevelDocument(level(VALID));
    expect(report.errors).toEqual([]);
    expect(report.triangles).toBe(VALID.length);
  });

  it('rejects names with dots or unknown prefixes', () => {
    const report = checkLevelDocument(level([...VALID, ['dyn.op-1', ['POSITION']]]));
    expect(report.errors.join()).toContain('dyn.op-1');
  });

  it('requires vertex colors and lightmap UVs on static, without normals', () => {
    expect(
      checkLevelDocument(level([['static', ['POSITION', 'TEXCOORD_0']]])).errors.join(),
    ).toContain('COLOR_0');
    expect(
      checkLevelDocument(
        level([['static', ['POSITION', 'NORMAL', 'COLOR_0', 'TEXCOORD_0']]]),
      ).errors.join(),
    ).toContain('NORMAL');
  });

  it('requires normals and colors on moving parts', () => {
    const report = checkLevelDocument(
      level([...VALID, ['dyn__op-2__body', ['POSITION', 'COLOR_0']]]),
    );
    expect(report.errors.join()).toContain('dyn__op-2__body');
  });

  it('requires exactly one static node', () => {
    expect(checkLevelDocument(level(VALID.slice(1))).errors.join()).toContain('exactly one');
  });
});

describe('checkBudgets', () => {
  it('passes within budget and fails loudly over it', () => {
    const ok = { errors: [], triangles: 1000 };
    expect(checkBudgets(ok, { glb: 100_000, lightmap: 100_000 })).toEqual([]);
    const fat = checkBudgets(
      { errors: [], triangles: 90_000 },
      { glb: 900_000, lightmap: 3_000_000 },
    );
    expect(fat).toHaveLength(3);
    expect(DEFAULT_LEVEL_BUDGET.maxTriangles).toBe(60_000);
  });
});
