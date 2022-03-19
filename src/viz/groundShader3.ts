import * as THREE from "three";
import { fasterTileBreakingFixMipmap } from "./shaders/fasterTileBreakingFixMipmap";

import { noiseShaders } from "./shaders/noise";

const buildNoiseTexture = (): THREE.DataTexture => {
  const noise = new Float32Array(256 * 256 * 4);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.random();
  }
  const texture = new THREE.DataTexture(
    noise,
    256,
    256,
    THREE.RGBAFormat,
    THREE.FloatType,
    undefined,
    THREE.RepeatWrapping,
    THREE.RepeatWrapping,
    // We need linear interpolation for the noise texture
    THREE.LinearFilter,
    THREE.LinearFilter
  );
  texture.needsUpdate = true;
  return texture;
};

const normalsFragment = `
#include <normal_fragment_begin>
// #include <normal_fragment_maps>

// BEGIN CUSTOM normal_fragment_maps
//
// We need to use the same custom lookup function we used for the texture for the normal map as well so that it matches
//
// Based on:
// https://github.com/mrdoob/three.js/blob/be57bd9b3ffa24b766758f6317fb040e151ef6c7/src/renderers/shaders/ShaderChunk/normal_fragment_maps.glsl.js

#ifdef OBJECTSPACE_NORMALMAP

  errror

#elif defined( TANGENTSPACE_NORMALMAP )
  vec3 yNormalMap = vec3(0.5, 0.5, 1.);

  // if (heightMix > 0.015) {
    yNormalMap = textureNoTile(texture1NormalMap, noiseSampler, vUvMINE, antiTileFactor, uvScale).xyz;
  // }

  vec3 mapN = yNormalMap * 2.0 - 1.0;
  mapN.xy *= normalScale;
  // gl_FragColor = vec4(mapN.xy, 0., 1.);
  // return;

  #ifdef USE_TANGENT

    normal = normalize( vTBN * mapN );

  #else

    normal = perturbNormal2Arb( - vViewPosition, normal, mapN, faceDirection );


  #endif

#elif defined( USE_BUMPMAP )

  normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );

#endif

// END CUSTOM normal_fragment_maps
`;

export const buildGroundShader = (
  baseTexture: THREE.Texture,
  [texture1, texture1NormalMap]: [THREE.Texture, THREE.Texture],
  [texture2, texture2NormalMap]: [THREE.Texture, THREE.Texture]
) => {
  console.log({ texture1, texture2 });
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,
    // THREE.UniformsLib.fog,
    // THREE.UniformsLib.lightmap,
    THREE.UniformsLib.common,
    THREE.UniformsLib.normalmap,
  ]);
  uniforms.baseTexSampler = { type: "t", value: baseTexture };
  uniforms.texSampler1 = { type: "t", value: texture1 };
  uniforms.texture1NormalMap = { type: "t", value: texture1NormalMap };
  uniforms.texSampler2 = { type: "t", value: texture2 };
  uniforms.texture2NormalMap = { type: "t", value: texture2NormalMap };
  uniforms.normalScale = { type: "v2", value: new THREE.Vector2(3.5, 3.5) };

  uniforms.noiseSampler = { type: "t", value: buildNoiseTexture() };
  uniforms.roughness = { type: "f", value: 0.98 };
  uniforms.metalness = { type: "f", value: 0.0 };
  uniforms.ior = { type: "f", value: 1.5 };
  uniforms.clearcoat = { type: "f", value: 0.0 };
  uniforms.clearcoatRoughness = { type: "f", value: 0.0 };
  uniforms.clearcoatNormal = { type: "f", value: 0.0 };
  uniforms.transmission = { type: "f", value: 0.0 };

  return {
    // fog: true,
    lights: true,
    // dithering: true,
    uniforms,
    vertexShader: `
    #define STANDARD
    varying vec3 vViewPosition;
    #ifdef USE_TRANSMISSION
      varying vec3 vWorldPosition;
    #endif
    #include <common>
    #include <uv_pars_vertex>
    #include <uv2_pars_vertex>
    #include <displacementmap_pars_vertex>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <normal_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    #include <shadowmap_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>

    varying vec2 vUvMINE;
    varying vec3 pos;
    varying vec3 vNormalMINE;

    void main() {
      vUvMINE = uv;
      pos = position;
      vNormalMINE = normal;

      #include <uv_vertex>
      #include <uv2_vertex>
      #include <color_vertex>
      #include <beginnormal_vertex>
      #include <morphnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
      #include <normal_vertex>
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>
      #include <displacementmap_vertex>
      #include <project_vertex>
      #include <logdepthbuf_vertex>
      #include <clipping_planes_vertex>
      vViewPosition = - mvPosition.xyz;
      #include <worldpos_vertex>
      #include <shadowmap_vertex>
      #include <fog_vertex>
      #ifdef USE_TRANSMISSION
        vWorldPosition = worldPosition.xyz;
      #endif
    }
    `,
    fragmentShader: `
    varying vec2 vUvMINE;
    varying vec3 pos;
    varying vec3 vNormalMINE;
    uniform sampler2D baseTexSampler;
    uniform sampler2D texSampler1;
    uniform sampler2D texture1NormalMap;
    uniform sampler2D texSampler2;
    uniform sampler2D texture2NormalMap;
    uniform sampler2D noiseSampler;

    #define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULARINTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
	#ifdef USE_SPECULARCOLORMAP
		uniform sampler2D specularColorMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEENCOLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEENROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

    #define antiTileFactor 0.4
    #define uvScale 60.0

    ${noiseShaders}

    ${fasterTileBreakingFixMipmap}

    void main() {
      #include <clipping_planes_fragment>

      vec4 diffuseColor = vec4( diffuse, opacity );
      ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
      vec3 totalEmissiveRadiance = emissive;

      // BEGIN CUSTOM MAP FRAGMENT

      float jitter = fbm(pos.xyz * 0.05);
      vec3 mountainColor = vec3(0.217, 0.21, 0.21);
      vec3 mountainColor2 = vec3(0.00105, 0.00105, 0.001032);
      vec3 texelColor = vec3(0.);
      float mountainCutoff = 96.;
      float offsetHeight = pos.y + -0.1 * pos.x + jitter * 58.;
      float terrainNoise = fbm(vec3(pos.x * 0.03, pos.y * 0.010, pos.z * 0.019) * 1.);

      float offsetDiff = offsetHeight - mountainCutoff;
      float heightFactor = smoothstep(0., 80., offsetDiff);

      if (offsetHeight > mountainCutoff - 50.) {

        vec3 grassColor = mountainColor;

        if (heightFactor < 0.99) {
          grassColor = textureNoTile(texSampler1, noiseSampler, vUvMINE, antiTileFactor, uvScale).xyz;
        }

        float mountainNoise = clamp(pow(terrainNoise, 2.), 0., 1.);
        vec3 mixedMountainColor = mix(mountainColor, mountainColor2, mountainNoise);
        // gl_FragColor = vec4(mixedMountainColor, 1.);
        // return;

        texelColor = mix(grassColor, mixedMountainColor, heightFactor);
      } else {
        texelColor = textureNoTile(texSampler1, noiseSampler, vUvMINE, antiTileFactor, uvScale).xyz;
      }

      vec3 grassColor = vec3(0.08, 0.25, 0.09);
      vec3 baseColor = mix(grassColor, mountainColor, smoothstep(100., 140., offsetHeight));
      texelColor = mix(texelColor, baseColor, clamp(terrainNoise - heightFactor, 0., 1.));

      float steepness = acos(vNormalMINE.y) / PI;
      vec3 slopeColor = vec3(0.042, 0.08, 0.043);
      float steepnessFactor = smoothstep(0., 2.5, pow(steepness, 1.7) * 24.3);
      float heightMix = clamp((offsetHeight - 30. - mountainCutoff) / 130., 0., 1.);
      float steepnessMix = clamp(steepnessFactor * 0.9 - heightMix, 0., 1.);
      // gl_FragColor = vec4(steepnessFactor, steepnessFactor, steepnessFactor, 1.);
      // return;
      texelColor = mix(texelColor, slopeColor, steepnessMix);

      float tiltBias = -0.15 * pos.z + -0.1 * pos.x;
      float cutoff = -28. + jitter * 70. + tiltBias;
      if (pos.y < cutoff && steepness > 0.08) {
        texelColor = mix(texelColor, slopeColor, steepness);
      }

      vec4 sampledDiffuseColor = vec4(texelColor, 1.);
      diffuseColor *= sampledDiffuseColor;

      // END CUSTOM MAP FRAGMENT

      // \\// This fragment applies vertex colors, but we only use vertex colors for texture mapping so
      //      it is left off.
      // #include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>

  ${normalsFragment}

  #include <clearcoat_normal_fragment_begin>
  #include <clearcoat_normal_fragment_maps>
  #include <emissivemap_fragment>

  // accumulation
  #include <lights_physical_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
  vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;

  #include <transmission_fragment>

  vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;

	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
    }`,
  };
};
