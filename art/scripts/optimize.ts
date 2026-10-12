import { type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

export async function createIO(): Promise<NodeIO> {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
}

/** The baked material ignores normals, so static geometry ships without them. */
export function stripStaticNormals(doc: Document): void {
  for (const node of doc.getRoot().listNodes()) {
    if (node.getName() !== 'static') continue;
    for (const primitive of node.getMesh()?.listPrimitives() ?? [])
      primitive.setAttribute('NORMAL', null);
  }
}

export async function optimizeLevel(input: string, output: string): Promise<void> {
  const io = await createIO();
  const doc = await io.read(input);
  stripStaticNormals(doc);
  await doc.transform(
    dedup(),
    prune({ keepLeaves: true }),
    weld(),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(output, doc);
}

export async function encodeLightmap(input: string, output: string): Promise<void> {
  await sharp(input).webp({ quality: 92, smartSubsample: true, effort: 6 }).toFile(output);
}

/** Character cast: skinned meshes keep their normals (matcap) and skin weights. */
export async function optimizeCast(input: string, output: string): Promise<void> {
  const io = await createIO();
  const doc = await io.read(input);
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(output, doc);
}
