import { ShaderMaterial, type Texture } from 'three';

/** Lightmaps store irradiance / headroom so that light up to 2x the palette brightness fits in 8 bits. */
export const LIGHTMAP_HEADROOM = 2;

/** Unlit material for static geometry: vertex albedo × baked light. No real-time lighting. */
export function createBakedMaterial(lightMap: Texture): ShaderMaterial {
  return new ShaderMaterial({
    vertexColors: true,
    uniforms: {
      uLightMap: { value: lightMap },
      uHeadroom: { value: LIGHTMAP_HEADROOM },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vAlbedo;
      void main() {
        vUv = uv;
        #if defined( USE_COLOR_ALPHA )
          vAlbedo = color.rgb;
        #elif defined( USE_COLOR )
          vAlbedo = color;
        #else
          vAlbedo = vec3( 1.0 );
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uLightMap;
      uniform float uHeadroom;
      varying vec2 vUv;
      varying vec3 vAlbedo;
      void main() {
        vec3 light = texture2D( uLightMap, vUv ).rgb * uHeadroom;
        gl_FragColor = vec4( vAlbedo * light, 1.0 );
        #include <colorspace_fragment>
      }
    `,
  });
}
