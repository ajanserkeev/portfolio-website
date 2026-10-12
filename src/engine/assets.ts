import { type LevelFiles, levelFilesFromGlob } from './glb-source';

const levelUrls = import.meta.glob('../assets/levels/*.{glb,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const textureUrls = import.meta.glob('../assets/textures/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const castUrls = import.meta.glob('../assets/cast.glb', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const levelFiles: ReadonlyMap<string, LevelFiles> = levelFilesFromGlob(levelUrls);

/** The character cast (contract 3.2.1), if it has been built. */
export const castUrl: string | undefined = castUrls['../assets/cast.glb'];

export function textureUrl(name: 'matcap' | 'screens' | 'faces'): string | undefined {
  return textureUrls[`../assets/textures/${name}.webp`];
}
