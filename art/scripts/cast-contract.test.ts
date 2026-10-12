import { Document } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { CAST_BONES, checkCastDocument } from './cast-contract';

interface Options {
  ids?: string[];
  skin?: boolean;
  triangles?: number;
  extraMesh?: boolean;
  clips?: string[];
  badName?: string;
}

function castDocument({
  ids = ['founder', 'guest'],
  skin = true,
  triangles = 800,
  extraMesh = false,
  clips = ['idle', 'type'],
  badName,
}: Options = {}): Document {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  let torso = null as ReturnType<Document['createNode']> | null;
  for (const id of ids) {
    const armature = doc.createNode(`cast__${id}`);
    const bones = CAST_BONES.map((name) => doc.createNode(name));
    for (const bone of bones) armature.addChild(bone);
    torso ??= bones[CAST_BONES.indexOf('torso')] ?? null;
    const position = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array(9))
      .setBuffer(buffer);
    const indices = doc
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Uint16Array(triangles * 3))
      .setBuffer(buffer);
    const primitive = doc.createPrimitive().setAttribute('POSITION', position).setIndices(indices);
    const mesh = doc
      .createNode(`cast__${id}__mesh`)
      .setMesh(doc.createMesh().addPrimitive(primitive));
    if (skin) mesh.setSkin(doc.createSkin().addJoint(bones[0] as never));
    armature.addChild(mesh);
    if (extraMesh) armature.addChild(doc.createNode(`cast__${id}__mesh`).setMesh(doc.createMesh()));
    scene.addChild(armature);
  }
  if (badName) scene.addChild(doc.createNode(badName));
  for (const name of clips) {
    const input = doc
      .createAccessor()
      .setArray(new Float32Array([0, 1]))
      .setBuffer(buffer);
    const output = doc
      .createAccessor()
      .setType('VEC4')
      .setArray(new Float32Array(8))
      .setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output);
    const channel = doc
      .createAnimationChannel()
      .setTargetNode(torso)
      .setTargetPath('rotation')
      .setSampler(sampler);
    doc.createAnimation(name).addSampler(sampler).addChannel(channel);
  }
  return doc;
}

describe('checkCastDocument', () => {
  it('accepts one skinned mesh per member and lists members and clips', () => {
    const report = checkCastDocument(castDocument());
    expect(report.errors).toEqual([]);
    expect(report.characters).toEqual(['founder', 'guest']);
    expect(report.clips).toEqual(['idle', 'type']);
    expect(report.maxTriangles).toBe(800);
  });

  it('rejects a member without a skin', () => {
    expect(checkCastDocument(castDocument({ skin: false })).errors).toContain(
      'cast__founder__mesh: the mesh must be skinned',
    );
  });

  it('rejects a member with more than one mesh', () => {
    expect(checkCastDocument(castDocument({ extraMesh: true })).errors.join()).toContain(
      'cast__founder: expected exactly one mesh',
    );
  });

  it('rejects a member over the triangle budget', () => {
    expect(checkCastDocument(castDocument({ triangles: 3200 })).errors.join()).toContain(
      'cast__founder: 3200 triangles',
    );
  });

  it('requires the idle clip', () => {
    expect(checkCastDocument(castDocument({ clips: ['type'] })).errors).toContain(
      'the cast must ship the "idle" clip',
    );
  });

  it('rejects names outside the contract', () => {
    expect(checkCastDocument(castDocument({ badName: 'Icosphere' })).errors).toContain(
      'unexpected node name "Icosphere"',
    );
  });
});
