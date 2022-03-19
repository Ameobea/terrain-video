import * as THREE from "three";
import * as Stats from "three/examples/jsm/libs/stats.module";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { buildGroundShader as buildGroundShader1 } from "./groundShader";
import { buildGroundShader as buildGroundShader2 } from "./groundShader2";
import { buildGroundShader as buildGroundShader3 } from "./groundShader3";
import { buildGroundShader as buildGroundShader4 } from "./groundShader4";
import { createAndAddFoliage } from "./instancing";

type Version = 1 | 2 | 3 | 4;

export const buildViz = (version: Version) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x77bedb);

  let bgImagePromise: Promise<ImageBitmap> | undefined;
  if (version >= 4) {
    const loader = new THREE.ImageBitmapLoader().setPath("/");
    bgImagePromise = loader.loadAsync(
      "blue clouded skydome panorama HDRi 360_smaller_2.jpeg"
    );
  }

  const ambientlight = new THREE.AmbientLight(0xe3d2d2, 0.8);
  scene.add(ambientlight);

  const directionalLight1 = new THREE.DirectionalLight(0xe3d2d2, 1.2);
  directionalLight1.position.set(400, 500, -200);
  scene.add(directionalLight1);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, 1200, 800);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  const stats = Stats.default();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";

  window.addEventListener("resize", onWindowResize);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    renderer.render(scene, camera);

    stats.update();

    controls.update();

    requestAnimationFrame(animate);
  }

  return {
    renderer,
    stats,
    scene,
    animate,
    bgImagePromise,
  };
};

export const initViz = (container: HTMLElement, version: Version) => {
  const viz = buildViz(version);

  container.appendChild(viz.renderer.domElement);
  container.appendChild(viz.stats.domElement);

  const loader = new GLTFLoader().setPath("/models/");

  loader.load("untitled.gltf", async (gltf) => {
    viz.scene.add(gltf.scene);

    const ground = viz.scene.getObjectByName("Cube") as THREE.Mesh;
    const origMaterial = ground.material as THREE.MeshStandardMaterial;

    const buildGroundShader = (
      {
        [1]: buildGroundShader1,
        [2]: buildGroundShader2,
        [3]: buildGroundShader3,
        [4]: buildGroundShader4,
      } as { [key: number]: typeof buildGroundShader1 }
    )[version];

    const groundMaterial = new THREE.ShaderMaterial(
      buildGroundShader(
        origMaterial.map as THREE.Texture,
        [origMaterial.map!, origMaterial.normalMap!],
        [origMaterial.map!, origMaterial.normalMap!]
      )
    );

    if (version > 1) {
      (groundMaterial as any).normalMap = origMaterial.normalMap;
      (groundMaterial as any).normalScale = origMaterial.normalScale;
      (groundMaterial as any).normalMapType = THREE.TangentSpaceNormalMap;
    }
    groundMaterial.vertexColors = false;
    ground.material = groundMaterial;

    if (version >= 3) {
      createAndAddFoliage(viz.scene);
    }

    if (version >= 4) {
      const customEightTone = new THREE.DataTexture(
        new Uint8ClampedArray([
          0, 0, 0, 255, 24, 24, 24, 255, 48, 48, 48, 255, 108, 108, 108, 255,
          141, 141, 141, 255, 155, 155, 155, 255, 175, 175, 175, 255, 255, 255,
          255, 255,
        ]),
        8,
        1,
        THREE.RGBAFormat,
        THREE.UnsignedByteType,
        THREE.UVMapping,
        THREE.ClampToEdgeWrapping,
        THREE.ClampToEdgeWrapping,
        THREE.NearestFilter,
        THREE.NearestFilter,
        1,
        THREE.LinearEncoding
      );
      customEightTone.generateMipmaps = false;
      customEightTone.needsUpdate = true;
      const toonMat = new THREE.MeshToonMaterial({
        color: 0x114202,
        gradientMap: customEightTone,
      });

      for (let leafIx = 1; leafIx <= 4; leafIx++) {
        for (let treeIx = 1; treeIx <= 7; treeIx++) {
          const leaf = viz.scene.getObjectByName(
            `Icosphere00${leafIx}_${treeIx}`
          ) as THREE.Mesh;
          if (!leaf) {
            continue;
          }

          leaf.material = toonMat;
        }

        const leaf = viz.scene.getObjectByName(
          `Icosphere00${leafIx}`
        ) as THREE.Mesh;
        leaf.material = toonMat;
      }

      viz.bgImagePromise!.then(function (imageBitmap: ImageBitmap) {
        const texture = new THREE.Texture(imageBitmap as any);
        texture.needsUpdate = true;
        texture.mapping = THREE.EquirectangularRefractionMapping;

        viz.scene.background = texture;
      });
    } else {
      const tree = viz.scene.getObjectByName("TREE");
      if (tree) {
        tree.children.forEach((child) => child.removeFromParent());
        tree.removeFromParent();
      }
      viz.scene.getObjectByName("TREE")?.removeFromParent();
      for (let i = 0; i <= 6; i++) {
        const tree = viz.scene.getObjectByName(`TREE00${i}`);
        if (!tree) {
          continue;
        }
        tree.children.forEach((child) => child.removeFromParent());
        tree.removeFromParent();
      }
    }

    viz.animate();
  });

  return {
    destroy() {
      viz.renderer.dispose();
    },
  };
};
