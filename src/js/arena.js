// 3D Arena creation with Three.js
import * as THREE from 'three';

const ARENA_SIZE = 40;
const WALL_HEIGHT = 2;

export function createArena(scene) {
  const arenaData = {
    size: ARENA_SIZE,
    walls: [],
    bushes: [],
    obstacles: [],
  };

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE, 20, 20);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3d7a3d,
    roughness: 0.9,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Ground grid lines for visual texture
  const lineMat = new THREE.LineBasicMaterial({ color: 0x2d6a2d, transparent: true, opacity: 0.3 });
  for (let i = -ARENA_SIZE / 2; i <= ARENA_SIZE / 2; i += 2) {
    const pts1 = [new THREE.Vector3(i, 0.01, -ARENA_SIZE / 2), new THREE.Vector3(i, 0.01, ARENA_SIZE / 2)];
    const pts2 = [new THREE.Vector3(-ARENA_SIZE / 2, 0.01, i), new THREE.Vector3(ARENA_SIZE / 2, 0.01, i)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), lineMat));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lineMat));
  }

  // Arena boundary walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
  const halfSize = ARENA_SIZE / 2;

  const wallConfigs = [
    { pos: [0, WALL_HEIGHT / 2, -halfSize], size: [ARENA_SIZE + 1, WALL_HEIGHT, 1] },
    { pos: [0, WALL_HEIGHT / 2, halfSize], size: [ARENA_SIZE + 1, WALL_HEIGHT, 1] },
    { pos: [-halfSize, WALL_HEIGHT / 2, 0], size: [1, WALL_HEIGHT, ARENA_SIZE + 1] },
    { pos: [halfSize, WALL_HEIGHT / 2, 0], size: [1, WALL_HEIGHT, ARENA_SIZE + 1] },
  ];

  wallConfigs.forEach(cfg => {
    const geo = new THREE.BoxGeometry(...cfg.size);
    const wall = new THREE.Mesh(geo, wallMat);
    wall.position.set(...cfg.pos);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    arenaData.walls.push({
      min: new THREE.Vector2(cfg.pos[0] - cfg.size[0] / 2, cfg.pos[2] - cfg.size[2] / 2),
      max: new THREE.Vector2(cfg.pos[0] + cfg.size[0] / 2, cfg.pos[2] + cfg.size[2] / 2),
    });
  });

  // Interior obstacles - boxes/crates
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7, metalness: 0.1 });
  const cratePositions = [
    [5, 5], [-5, -5], [8, -3], [-8, 3], [0, 10], [0, -10],
    [12, 8], [-12, -8], [10, -10], [-10, 10],
    [3, -7], [-3, 7], [15, 0], [-15, 0],
    [-6, 14], [6, -14], [14, 14], [-14, -14],
  ];

  cratePositions.forEach(([x, z]) => {
    const w = 1 + Math.random() * 1.5;
    const h = 1 + Math.random() * 1;
    const d = 1 + Math.random() * 1.5;
    const geo = new THREE.BoxGeometry(w, h, d);
    const crate = new THREE.Mesh(geo, crateMat);
    crate.position.set(x, h / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
    arenaData.obstacles.push({
      x, z,
      halfW: w / 2 + 0.3,
      halfD: d / 2 + 0.3,
      min: new THREE.Vector2(x - w / 2, z - d / 2),
      max: new THREE.Vector2(x + w / 2, z + d / 2),
    });
  });

  // Bush areas (tall grass for hiding)
  const bushMat = new THREE.MeshStandardMaterial({
    color: 0x1a5c1a,
    roughness: 1.0,
    transparent: true,
    opacity: 0.7,
  });

  const bushClusters = [
    { cx: -12, cz: 0, count: 6 },
    { cx: 12, cz: 0, count: 6 },
    { cx: 0, cz: -15, count: 5 },
    { cx: 0, cz: 15, count: 5 },
    { cx: -8, cz: -12, count: 4 },
    { cx: 8, cz: 12, count: 4 },
  ];

  bushClusters.forEach(cluster => {
    for (let i = 0; i < cluster.count; i++) {
      const angle = (i / cluster.count) * Math.PI * 2;
      const r = 1 + Math.random() * 1.5;
      const bx = cluster.cx + Math.cos(angle) * r;
      const bz = cluster.cz + Math.sin(angle) * r;
      const size = 0.8 + Math.random() * 0.6;
      const geo = new THREE.CylinderGeometry(size * 0.5, size * 0.7, 1.2, 6);
      const bush = new THREE.Mesh(geo, bushMat);
      bush.position.set(bx, 0.6, bz);
      scene.add(bush);
      arenaData.bushes.push({ x: bx, z: bz, radius: size * 0.7 });
    }
  });

  // Water puddles for decoration
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3498db,
    roughness: 0.1,
    metalness: 0.5,
    transparent: true,
    opacity: 0.6,
  });

  [[-5, 12], [7, -8], [-14, -6]].forEach(([x, z]) => {
    const r = 1.5 + Math.random();
    const geo = new THREE.CircleGeometry(r, 16);
    const water = new THREE.Mesh(geo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.03, z);
    scene.add(water);
  });

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  dirLight.position.set(15, 25, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 60;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
  fillLight.position.set(-10, 15, -10);
  scene.add(fillLight);

  // Skybox color
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 30, 55);

  return arenaData;
}

export function checkCollision(x, z, radius, arenaData) {
  const half = arenaData.size / 2 - 0.5;
  let nx = x, nz = z;

  // Arena bounds
  nx = Math.max(-half + radius, Math.min(half - radius, nx));
  nz = Math.max(-half + radius, Math.min(half - radius, nz));

  // Obstacles
  for (const obs of arenaData.obstacles) {
    const closestX = Math.max(obs.min.x, Math.min(nx, obs.max.x));
    const closestZ = Math.max(obs.min.y, Math.min(nz, obs.max.y));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < radius) {
      if (dist > 0) {
        nx = closestX + (dx / dist) * radius;
        nz = closestZ + (dz / dist) * radius;
      } else {
        nx += radius;
      }
    }
  }

  return { x: nx, z: nz };
}

export function lineHitsObstacle(x1, z1, x2, z2, arenaData) {
  for (const obs of arenaData.obstacles) {
    // Simple AABB vs line segment check
    const minX = obs.min.x - 0.15;
    const maxX = obs.max.x + 0.15;
    const minZ = obs.min.y - 0.15;
    const maxZ = obs.max.y + 0.15;

    const dx = x2 - x1;
    const dz = z2 - z1;

    let tmin = 0, tmax = 1;

    if (Math.abs(dx) > 0.001) {
      let t1 = (minX - x1) / dx;
      let t2 = (maxX - x1) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    } else if (x1 < minX || x1 > maxX) {
      continue;
    }

    if (Math.abs(dz) > 0.001) {
      let t1 = (minZ - z1) / dz;
      let t2 = (maxZ - z1) / dz;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    } else if (z1 < minZ || z1 > maxZ) {
      continue;
    }

    if (tmin <= tmax) return true;
  }
  return false;
}

export function isInBush(x, z, arenaData) {
  for (const bush of arenaData.bushes) {
    const dx = x - bush.x;
    const dz = z - bush.z;
    if (dx * dx + dz * dz < bush.radius * bush.radius) return true;
  }
  return false;
}
