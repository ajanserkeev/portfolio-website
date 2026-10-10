import type { Document } from '@gltf-transform/core';

export const NODE_NAME =
  /^(static|screens|glow|dyn__[a-z0-9-]+(__[a-z0-9-]+)?|anchor__[a-z0-9-]+(__[a-z0-9-]+)*|hit__[a-z0-9-]+)$/;

export interface LevelBudget {
  maxTriangles: number;
  maxGlbBytes: number;
  maxLightmapBytes: number;
}

export const DEFAULT_LEVEL_BUDGET: LevelBudget = {
  maxTriangles: 60_000,
  maxGlbBytes: 450_000,
  maxLightmapBytes: 250_000,
};

export interface ContractReport {
  errors: string[];
  triangles: number;
}

export function checkLevelDocument(doc: Document): ContractReport {
  const errors: string[] = [];
  let triangles = 0;
  const nodes = doc.getRoot().listNodes();
  for (const node of nodes) {
    if (!NODE_NAME.test(node.getName())) errors.push(`unexpected node name "${node.getName()}"`);
  }
  if (nodes.filter((node) => node.getName() === 'static').length !== 1) {
    errors.push('expected exactly one "static" node');
  }
  for (const node of nodes) {
    const name = node.getName();
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const count =
        primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0;
      triangles += count / 3;
      const has = (semantic: string) => primitive.getAttribute(semantic) !== null;
      if (name === 'static') {
        if (!has('COLOR_0')) errors.push('static: missing COLOR_0 (albedo)');
        if (!has('TEXCOORD_0')) errors.push('static: missing TEXCOORD_0 (lightmap UV)');
        if (has('NORMAL')) errors.push('static: NORMAL must be stripped');
      } else if (name === 'screens' && !has('TEXCOORD_0')) {
        errors.push('screens: missing TEXCOORD_0');
      } else if (name === 'glow' && !has('COLOR_0')) {
        errors.push('glow: missing COLOR_0');
      } else if (name.startsWith('dyn__') && name.endsWith('__face') && !has('TEXCOORD_0')) {
        errors.push(`${name}: faces need TEXCOORD_0`);
      } else if (
        name.startsWith('dyn__') &&
        !name.endsWith('__face') &&
        (!has('NORMAL') || !has('COLOR_0'))
      ) {
        errors.push(`${name}: moving parts need NORMAL and COLOR_0`);
      }
    }
  }
  return { errors, triangles: Math.round(triangles) };
}

export function checkBudgets(
  report: ContractReport,
  sizes: { glb: number; lightmap: number },
  budget: LevelBudget = DEFAULT_LEVEL_BUDGET,
): string[] {
  const problems: string[] = [];
  if (report.triangles > budget.maxTriangles) {
    problems.push(`triangles ${report.triangles} > ${budget.maxTriangles}`);
  }
  if (sizes.glb > budget.maxGlbBytes) problems.push(`GLB ${sizes.glb} B > ${budget.maxGlbBytes} B`);
  if (sizes.lightmap > budget.maxLightmapBytes) {
    problems.push(`lightmap ${sizes.lightmap} B > ${budget.maxLightmapBytes} B`);
  }
  return problems;
}
