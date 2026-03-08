// Brawler definitions and factory
import * as THREE from 'three';

export const BRAWLER_DEFS = {
  tank: {
    name: 'BULL',
    hp: 1200,
    speed: 3.5,
    damage: 80,
    range: 6,
    attackSpeed: 0.6,  // attacks per second
    projectileSpeed: 18,
    projectileCount: 5, // shotgun spread
    spread: 0.35,
    ammoMax: 3,
    reloadTime: 1.8,
    superCharge: 12,    // hits to charge super
    superDamage: 200,
    bodyColor: 0xc0392b,
    accentColor: 0xff6b6b,
    projectileColor: 0xff4444,
    bodyRadius: 0.6,
    description: 'Shotgun blast',
  },
  sniper: {
    name: 'PIPER',
    hp: 600,
    speed: 4.2,
    damage: 280,
    range: 22,
    attackSpeed: 0.45,
    projectileSpeed: 30,
    projectileCount: 1,
    spread: 0,
    ammoMax: 3,
    reloadTime: 2.2,
    superCharge: 4,
    superDamage: 150,
    bodyColor: 0x6c5ce7,
    accentColor: 0xa29bfe,
    projectileColor: 0xbb99ff,
    bodyRadius: 0.45,
    description: 'Long-range shot',
  },
  fighter: {
    name: 'PRIMO',
    hp: 900,
    speed: 5.0,
    damage: 110,
    range: 2.5,
    attackSpeed: 1.2,
    projectileSpeed: 0,  // melee
    projectileCount: 1,
    spread: 0,
    ammoMax: 4,
    reloadTime: 0.8,
    superCharge: 8,
    superDamage: 300,
    bodyColor: 0x00b894,
    accentColor: 0x55efc4,
    projectileColor: 0x00ff88,
    bodyRadius: 0.55,
    description: 'Melee punch',
  },
};

export function createBrawlerMesh(type) {
  const def = BRAWLER_DEFS[type];
  const group = new THREE.Group();

  // Body - main sphere
  const bodyGeo = new THREE.SphereGeometry(def.bodyRadius, 16, 12);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.bodyColor,
    roughness: 0.4,
    metalness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = def.bodyRadius;
  body.castShadow = true;
  group.add(body);

  // Head
  const headRadius = def.bodyRadius * 0.55;
  const headGeo = new THREE.SphereGeometry(headRadius, 12, 10);
  const headMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    roughness: 0.3,
    metalness: 0.2,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = def.bodyRadius * 2 + headRadius * 0.5;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(headRadius * 0.15, 8, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
  const pupilGeo = new THREE.SphereGeometry(headRadius * 0.08, 6, 4);
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * headRadius * 0.35, def.bodyRadius * 2 + headRadius * 0.6, headRadius * 0.75);
    group.add(eye);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * headRadius * 0.35, def.bodyRadius * 2 + headRadius * 0.6, headRadius * 0.88);
    group.add(pupil);
  });

  // Type-specific features
  if (type === 'tank') {
    // Shotgun barrel
    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.35, def.bodyRadius * 1.2, def.bodyRadius + 0.3);
    group.add(barrel);
  } else if (type === 'sniper') {
    // Long rifle
    const rifleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.2, 8);
    const rifleMat = new THREE.MeshStandardMaterial({ color: 0x8866cc, metalness: 0.6, roughness: 0.3 });
    const rifle = new THREE.Mesh(rifleGeo, rifleMat);
    rifle.rotation.x = Math.PI / 2;
    rifle.position.set(0.3, def.bodyRadius * 1.4, def.bodyRadius + 0.5);
    group.add(rifle);
    // Scope
    const scopeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);
    const scope = new THREE.Mesh(scopeGeo, rifleMat);
    scope.position.set(0.3, def.bodyRadius * 1.6, def.bodyRadius + 0.3);
    group.add(scope);
  } else if (type === 'fighter') {
    // Boxing gloves
    [-1, 1].forEach(side => {
      const gloveGeo = new THREE.SphereGeometry(0.2, 8, 6);
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.6 });
      const glove = new THREE.Mesh(gloveGeo, gloveMat);
      glove.position.set(side * (def.bodyRadius + 0.25), def.bodyRadius * 1.1, def.bodyRadius * 0.4);
      group.add(glove);
    });
  }

  // Shadow disc
  const shadowGeo = new THREE.CircleGeometry(def.bodyRadius * 0.8, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return group;
}

export function createProjectile(type, position, direction) {
  const def = BRAWLER_DEFS[type];
  const group = new THREE.Group();

  if (type === 'fighter') {
    // Melee - fist wave effect
    const geo = new THREE.RingGeometry(0.1, 0.4, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: def.projectileColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
  } else {
    const size = type === 'sniper' ? 0.12 : 0.15;
    const geo = new THREE.SphereGeometry(size, 6, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: def.projectileColor,
      transparent: true,
      opacity: 0.9,
    });
    group.add(new THREE.Mesh(geo, mat));

    // Trail glow
    const glowGeo = new THREE.SphereGeometry(size * 2, 6, 4);
    const glowMat = new THREE.MeshBasicMaterial({
      color: def.projectileColor,
      transparent: true,
      opacity: 0.3,
    });
    group.add(new THREE.Mesh(glowGeo, glowMat));
  }

  group.position.copy(position);
  group.position.y = 0.8;

  return group;
}
