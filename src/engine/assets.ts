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

export const levelFiles: ReadonlyMap<string, LevelFiles> = levelFilesFromGlob(levelUrls);

export function textureUrl(name: 'matcap' | 'screens' | 'faces'): string | undefined {
  return textureUrls[`../assets/textures/${name}.webp`];
}
