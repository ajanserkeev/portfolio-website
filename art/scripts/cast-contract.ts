import type { Document, Node } from '@gltf-transform/core';

/** The 7-bone rig every Kenney Mini Characters member shares; clips address bones by these names. */
export const CAST_BONES = [
  'root',
  'torso',
  'head',
  'arm-left',
  'arm-right',
  'leg-left',
  'leg-right',
] as const;

export const CAST_BUDGET = { maxBytes: 350_000, maxTrianglesPerMember: 3_000 };

const MEMBER = /^cast__([a-z0-9-]+)$/;
const MESH = /^cast__[a-z0-9-]+__mesh$/;
const BONES = new Set<string>(CAST_BONES);

export interface CastReport {
  errors: string[];
  characters: string[];
  clips: string[];
  maxTriangles: number;
}

function triangles(node: Node): number {
  let count = 0;
  for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
    count +=
      (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0) /
      3;
  }
  return Math.round(count);
}

/** src/assets/cast.glb: `cast__<id>` skeletons, each with one skinned `cast__<id>__mesh`, plus shared clips. */
export function checkCastDocument(doc: Document): CastReport {
  const errors: string[] = [];
  const characters: string[] = [];
  let maxTriangles = 0;
  const root = doc.getRoot();

  for (const node of root.listNodes()) {
    const name = node.getName();
    if (!MEMBER.test(name) && !MESH.test(name) && !BONES.has(name)) {
      errors.push(`unexpected node name "${name}"`);
    }
    const id = MEMBER.exec(name)?.[1];
    if (!id) continue;
    characters.push(id);
    const meshes = node.listChildren().filter((child) => child.getMesh());
    if (meshes.length !== 1 || meshes[0]?.getName() !== `${name}__mesh`) {
      errors.push(`${name}: expected exactly one mesh named ${name}__mesh`);
      continue;
    }
    const mesh = meshes[0];
    if (!mesh.getSkin()) errors.push(`${mesh.getName()}: the mesh must be skinned`);
    const count = triangles(mesh);
    maxTriangles = Math.max(maxTriangles, count);
    if (count > CAST_BUDGET.maxTrianglesPerMember) {
      errors.push(`${name}: ${count} triangles (max ${CAST_BUDGET.maxTrianglesPerMember})`);
    }
  }

  const clips = root.listAnimations().map((animation) => animation.getName());
  if (!clips.includes('idle')) errors.push('the cast must ship the "idle" clip');
  for (const animation of root.listAnimations()) {
    for (const channel of animation.listChannels()) {
      const target = channel.getTargetNode()?.getName() ?? '';
      if (!BONES.has(target)) {
        errors.push(`clip "${animation.getName()}" animates "${target}", not a rig bone`);
        break;
      }
    }
  }
  return { errors, characters, clips, maxTriangles };
}
