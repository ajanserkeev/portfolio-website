import { Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { createBakedMaterial, LIGHTMAP_HEADROOM } from './baked';

describe('createBakedMaterial', () => {
  it('multiplies vertex albedo by the lightmap with headroom', () => {
    const lightMap = new Texture();
    const material = createBakedMaterial(lightMap);
    expect(material.vertexColors).toBe(true);
    expect(material.uniforms.uLightMap?.value).toBe(lightMap);
    expect(material.uniforms.uHeadroom?.value).toBe(LIGHTMAP_HEADROOM);
    expect(material.fragmentShader).toContain('vAlbedo * light');
    expect(material.fragmentShader).toContain('colorspace_fragment');
  });
});
