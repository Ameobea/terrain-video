import * as THREE from "three";

import { MeshSurfaceSampler } from "./MeshSurfaceSampler";

const GRASS_POINT_COUNT = 3000;
const FLOWER_INSTANCE_COUNT = 222;
const SHRUB_INSTANCE_COUNT = 100;

const createInstancePoints = (
  sampler: MeshSurfaceSampler,
  pointCount: number
) => {
  const points = new Float32Array(pointCount * 3);
  const normals = new Float32Array(pointCount * 3);

  const pos = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < pointCount; i++) {
    sampler.sample(pos, normal);
    points[i * 3 + 0] = pos.x;
    points[i * 3 + 1] = pos.y;
    points[i * 3 + 2] = pos.z;
    normals[i * 3 + 0] = normal.x;
    normals[i * 3 + 1] = normal.y;
    normals[i * 3 + 2] = normal.z;
  }
  return { points, normals };
};

const createFoliageInstancedMesh = (
  positions: Float32Array,
  normals: Float32Array,
  mesh: THREE.Mesh,
  scaleMultiplier: THREE.Vector3,
  alignToNormal: boolean
) => {
  const material = mesh.material as THREE.MeshStandardMaterial;
  const texture = material.map;
  if (texture) {
    texture.minFilter = THREE.NearestMipMapLinearFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }

  const instances = new THREE.InstancedMesh(
    mesh.geometry,
    new THREE.MeshLambertMaterial({
      color: material.color,
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.4,
      reflectivity: 0,
    }),
    positions.length / 3
  );
  instances.material.side = THREE.DoubleSide;
  instances.material.needsUpdate = true;
  instances.castShadow = false;
  instances.receiveShadow = true;
  const translation = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const quat = new THREE.Quaternion();
  const mat = new THREE.Matrix4();
  const axis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    translation.set(x, y + 10.6, z);
    // if (alignToNormal) {
    //   // set quat from normal angle
    //   axis.set(normals[i + 2], 0, -normals[i]).normalize();
    //   const rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, Math.acos(normals[i + 1]));
    //   quat.setFromRotationMatrix(rotationMatrix);
    // } else {
    quat.setFromAxisAngle(axis, Math.random() * Math.PI * 2);
    // }

    scale
      .set(
        4.8 + Math.random() * 0.8,
        5.6 + Math.random() * 0.8,
        4.8 + Math.random() * 0.8
      )
      .multiply(scaleMultiplier);
    mat.compose(translation, quat, scale);
    instances.setMatrixAt(i / 3, mat);
  }

  return instances;
};

const createAndAddGrassPatches = (
  scene: THREE.Scene,
  groundSurfaceSampler: MeshSurfaceSampler
) => {
  const patch1 = scene.getObjectByName("Grass") as THREE.Mesh;

  const { points: grassPoints, normals: grassNormals } = createInstancePoints(
    groundSurfaceSampler,
    GRASS_POINT_COUNT
  );

  const scale = new THREE.Vector3(2.1, 3.3, 2.1);
  const instances1 = createFoliageInstancedMesh(
    grassPoints,
    grassNormals,
    patch1,
    scale,
    true
  );
  scene.add(instances1);
};

// const createAndAddFlowers = (
//   scene: THREE.Scene,
//   groundSurfaceSampler: MeshSurfaceSampler
// ) => {
//   const flower = scene.getObjectByName("flower_1") as THREE.Mesh;
//   flower.removeFromParent();

//   const { points, normals } = createInstancePoints(
//     groundSurfaceSampler,
//     FLOWER_INSTANCE_COUNT
//   );
//   const instances = createFoliageInstancedMesh(
//     points,
//     normals,
//     flower,
//     new THREE.Vector3(1.2, 1.2, 1.2),
//     false
//   );
//   scene.add(instances);
// };

// const createAndAddShrubs = (
//   scene: THREE.Scene,
//   groundSurfaceSampler: MeshSurfaceSampler
// ) => {
//   const shrub = scene.getObjectByName("grass_patch") as THREE.Mesh;
//   console.log(shrub);
//   shrub.removeFromParent();

//   const { points, normals } = createInstancePoints(
//     groundSurfaceSampler,
//     SHRUB_INSTANCE_COUNT
//   );
//   const instances = createFoliageInstancedMesh(
//     points,
//     normals,
//     shrub,
//     new THREE.Vector3(2.2, 2.2, 2.2),
//     false
//   );
//   scene.add(instances);
// };

export const createAndAddFoliage = (scene: THREE.Scene) => {
  const ground = scene.getObjectByName("Cube") as THREE.Mesh;
  const surfaceSampler = new MeshSurfaceSampler(ground).build();

  createAndAddGrassPatches(scene, surfaceSampler);
  // createAndAddFlowers(scene, surfaceSampler);
  // createAndAddShrubs(scene, surfaceSampler);
};
