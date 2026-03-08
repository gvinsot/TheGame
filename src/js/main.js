// BrawlArena 3D - Main Game Engine
import * as THREE from 'three';
import { BRAWLER_DEFS, createBrawlerMesh, createProjectile } from './brawlers.js';
import { createArena, checkCollision, lineHitsObstacle, isInBush } from './arena.js';
import { AIController } from './ai.js';

// ============== GAME STATE ==============
const game = {
  scene: null,
  camera: null,
  renderer: null,
  clock: new THREE.Clock(),
  arenaData: null,
  player: null,
  entities: [],
  projectiles: [],
  aiControllers: [],
  input: { w: false, a: false, s: false, d: false, mouse: new THREE.Vector2(), shooting: false, super: false },
  raycaster: new THREE.Raycaster(),
  groundPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  stats: { kills: 0, damage: 0, startTime: 0 },
  gameTime: 120, // 2 minutes
  running: false,
  selectedBrawler: null,
};

// ============== MENU ==============
const menuScreen = document.getElementById('menu-screen');
const gameHud = document.getElementById('game-hud');
const gameoverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

document.querySelectorAll('.brawler-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.brawler-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    game.selectedBrawler = card.dataset.brawler;
    startBtn.disabled = false;
    startBtn.textContent = `PLAY AS ${BRAWLER_DEFS[game.selectedBrawler].name}`;
  });
});

startBtn.addEventListener('click', () => {
  if (!game.selectedBrawler) return;
  menuScreen.classList.add('hidden');
  gameHud.classList.remove('hidden');
  startGame(game.selectedBrawler);
});

restartBtn.addEventListener('click', () => {
  gameoverScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  gameHud.classList.add('hidden');
  cleanup();
});

// ============== INIT 3D ==============
function initRenderer() {
  game.scene = new THREE.Scene();

  game.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  game.camera.position.set(0, 18, 14);
  game.camera.lookAt(0, 0, 0);

  game.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  game.renderer.setSize(window.innerWidth, window.innerHeight);
  game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  game.renderer.shadowMap.enabled = true;
  game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  game.renderer.toneMappingExposure = 1.1;

  const container = document.getElementById('game-container');
  container.innerHTML = '';
  container.appendChild(game.renderer.domElement);

  window.addEventListener('resize', () => {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============== ENTITY ==============
function createEntity(type, x, z, isPlayer = false) {
  const def = BRAWLER_DEFS[type];
  const mesh = createBrawlerMesh(type);
  mesh.position.set(x, 0, z);
  game.scene.add(mesh);

  // Health bar above head
  const hbCanvas = document.createElement('canvas');
  hbCanvas.width = 128;
  hbCanvas.height = 16;
  const hbTexture = new THREE.CanvasTexture(hbCanvas);
  const hbMat = new THREE.SpriteMaterial({ map: hbTexture, transparent: true });
  const hbSprite = new THREE.Sprite(hbMat);
  hbSprite.scale.set(1.5, 0.2, 1);
  hbSprite.position.y = def.bodyRadius * 2 + def.bodyRadius * 0.55 * 2 + 0.5;
  mesh.add(hbSprite);

  // Name label
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 256;
  nameCanvas.height = 32;
  const nameCtx = nameCanvas.getContext('2d');
  nameCtx.font = 'bold 20px sans-serif';
  nameCtx.textAlign = 'center';
  nameCtx.fillStyle = isPlayer ? '#ffd700' : '#ff4444';
  nameCtx.fillText(isPlayer ? def.name : `BOT ${def.name}`, 128, 22);
  const nameTexture = new THREE.CanvasTexture(nameCanvas);
  const nameMat = new THREE.SpriteMaterial({ map: nameTexture, transparent: true });
  const nameSprite = new THREE.Sprite(nameMat);
  nameSprite.scale.set(2, 0.3, 1);
  nameSprite.position.y = def.bodyRadius * 2 + def.bodyRadius * 0.55 * 2 + 0.8;
  mesh.add(nameSprite);

  const entity = {
    type,
    mesh,
    hp: def.hp,
    maxHp: def.hp,
    ammo: def.ammoMax,
    maxAmmo: def.ammoMax,
    reloadTimer: 0,
    attackCooldown: 0,
    superCharge: 0,
    superReady: false,
    isPlayer,
    alive: true,
    respawnTimer: 0,
    hbCanvas,
    hbTexture,
    hbSprite,
    invulnTimer: 0,
  };

  updateHealthBar(entity);
  game.entities.push(entity);
  return entity;
}

function updateHealthBar(entity) {
  const ctx = entity.hbCanvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 16);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 128, 16);

  // Health
  const pct = Math.max(0, entity.hp / entity.maxHp);
  const color = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillStyle = color;
  ctx.fillRect(2, 2, 124 * pct, 12);

  entity.hbTexture.needsUpdate = true;
}

// ============== INPUT ==============
function setupInput() {
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key in game.input) game.input[key] = true;
    if (key === ' ') { game.input.super = true; e.preventDefault(); }
  });

  window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (key in game.input) game.input[key] = false;
    if (key === ' ') game.input.super = false;
  });

  window.addEventListener('mousemove', e => {
    game.input.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    game.input.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener('mousedown', e => {
    if (e.button === 0) game.input.shooting = true;
  });

  window.addEventListener('mouseup', e => {
    if (e.button === 0) game.input.shooting = false;
  });

  // Prevent context menu
  window.addEventListener('contextmenu', e => e.preventDefault());
}

// ============== SHOOTING ==============
function getAimDirection() {
  game.raycaster.setFromCamera(game.input.mouse, game.camera);
  const intersect = new THREE.Vector3();
  game.raycaster.ray.intersectPlane(game.groundPlane, intersect);
  if (!intersect) return null;

  const pos = game.player.mesh.position;
  const dx = intersect.x - pos.x;
  const dz = intersect.z - pos.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.1) return null;

  return { x: dx / len, z: dz / len };
}

function shoot(entity, dirX, dirZ) {
  const def = BRAWLER_DEFS[entity.type];
  if (entity.ammo < 1 || entity.attackCooldown > 0) return;

  entity.ammo--;
  entity.attackCooldown = 1 / def.attackSpeed;

  const pos = entity.mesh.position.clone();

  if (entity.type === 'fighter') {
    // Melee attack - instant area damage
    const projMesh = createProjectile('fighter', pos, { x: dirX, z: dirZ });
    game.scene.add(projMesh);

    game.projectiles.push({
      mesh: projMesh,
      owner: entity,
      type: entity.type,
      vx: dirX * 8,
      vz: dirZ * 8,
      damage: def.damage,
      range: def.range,
      traveled: 0,
      maxTravel: def.range,
      lifetime: 0.3,
    });

    // Lunge forward slightly
    const newPos = checkCollision(
      pos.x + dirX * 0.8,
      pos.z + dirZ * 0.8,
      def.bodyRadius,
      game.arenaData
    );
    entity.mesh.position.x = newPos.x;
    entity.mesh.position.z = newPos.z;
  } else {
    // Ranged attack
    for (let i = 0; i < def.projectileCount; i++) {
      let pdx = dirX, pdz = dirZ;
      if (def.spread > 0) {
        const angle = Math.atan2(dirX, dirZ) + (Math.random() - 0.5) * def.spread * 2;
        pdx = Math.sin(angle);
        pdz = Math.cos(angle);
      }

      const projMesh = createProjectile(entity.type, pos, { x: pdx, z: pdz });
      game.scene.add(projMesh);

      game.projectiles.push({
        mesh: projMesh,
        owner: entity,
        type: entity.type,
        vx: pdx * def.projectileSpeed,
        vz: pdz * def.projectileSpeed,
        damage: entity.type === 'tank' ? Math.round(def.damage / def.projectileCount * (1 + Math.random() * 0.3)) : def.damage,
        range: def.range,
        traveled: 0,
        maxTravel: def.range + (entity.type === 'sniper' ? 5 : 0),
        lifetime: 3,
      });
    }
  }

  // Face shoot direction
  entity.mesh.rotation.y = Math.atan2(dirX, dirZ);
}

function useSuper(entity) {
  if (!entity.superReady) return;
  entity.superReady = false;
  entity.superCharge = 0;

  const def = BRAWLER_DEFS[entity.type];
  const pos = entity.mesh.position;

  if (entity.type === 'tank') {
    // Bull rush - charge forward dealing damage
    const dir = getAimDirection();
    if (!dir) return;
    for (let i = 0; i < 8; i++) {
      const offset = (i - 3.5) * 0.3;
      const angle = Math.atan2(dir.x, dir.z) + offset * 0.15;
      const pdx = Math.sin(angle);
      const pdz = Math.cos(angle);
      const projMesh = createProjectile(entity.type, pos, { x: pdx, z: pdz });
      game.scene.add(projMesh);
      game.projectiles.push({
        mesh: projMesh, owner: entity, type: entity.type,
        vx: pdx * def.projectileSpeed * 1.5,
        vz: pdz * def.projectileSpeed * 1.5,
        damage: Math.round(def.superDamage / 8),
        range: def.range * 2, traveled: 0, maxTravel: def.range * 2, lifetime: 2,
      });
    }
  } else if (entity.type === 'sniper') {
    // Piper bomb - AoE explosion at target
    const dir = getAimDirection() || { x: 0, z: 1 };
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const pdx = Math.sin(angle);
      const pdz = Math.cos(angle);
      const projMesh = createProjectile(entity.type, pos, { x: pdx, z: pdz });
      game.scene.add(projMesh);
      game.projectiles.push({
        mesh: projMesh, owner: entity, type: entity.type,
        vx: pdx * 15,
        vz: pdz * 15,
        damage: Math.round(def.superDamage / 4),
        range: 8, traveled: 0, maxTravel: 8, lifetime: 1.5,
      });
    }
    // Jump backward
    const newPos = checkCollision(
      pos.x - dir.x * 5, pos.z - dir.z * 5,
      def.bodyRadius, game.arenaData
    );
    entity.mesh.position.x = newPos.x;
    entity.mesh.position.z = newPos.z;
  } else if (entity.type === 'fighter') {
    // Primo elbow drop - leap and AoE
    const dir = getAimDirection() || { x: 0, z: 1 };
    const landX = pos.x + dir.x * 6;
    const landZ = pos.z + dir.z * 6;
    const newPos = checkCollision(landX, landZ, def.bodyRadius, game.arenaData);
    entity.mesh.position.x = newPos.x;
    entity.mesh.position.z = newPos.z;

    // AoE damage around landing
    for (const e of game.entities) {
      if (e === entity || e.hp <= 0) continue;
      const dx = e.mesh.position.x - newPos.x;
      const dz = e.mesh.position.z - newPos.z;
      if (Math.sqrt(dx * dx + dz * dz) < 3.5) {
        dealDamage(e, def.superDamage, entity);
      }
    }

    // Visual effect
    const ringGeo = new THREE.RingGeometry(0.5, 3.5, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(newPos.x, 0.1, newPos.z);
    game.scene.add(ring);
    setTimeout(() => game.scene.remove(ring), 500);
  }
}

function dealDamage(target, amount, attacker) {
  if (target.invulnTimer > 0) return;
  target.hp -= amount;
  updateHealthBar(target);

  if (attacker && attacker.isPlayer) {
    game.stats.damage += amount;
  }

  // Super charge
  if (attacker) {
    attacker.superCharge++;
    const def = BRAWLER_DEFS[attacker.type];
    if (attacker.superCharge >= def.superCharge) {
      attacker.superReady = true;
    }
  }

  // Floating damage number
  showDamageNumber(target.mesh.position, amount);

  if (target.hp <= 0) {
    killEntity(target, attacker);
  }
}

function killEntity(entity, killer) {
  entity.alive = false;
  entity.hp = 0;
  entity.mesh.visible = false;

  if (killer && killer.isPlayer) {
    game.stats.kills++;
    document.getElementById('hud-kills').textContent = game.stats.kills;
  }

  if (entity.isPlayer) {
    // Player dies - respawn after 3s
    entity.respawnTimer = 3;
  } else {
    // Bot dies - respawn after 5s
    entity.respawnTimer = 5;
  }

  // Death particles
  spawnParticles(entity.mesh.position, BRAWLER_DEFS[entity.type].bodyColor, 15);
}

function respawnEntity(entity) {
  const def = BRAWLER_DEFS[entity.type];
  const half = game.arenaData.size / 2 - 5;
  entity.mesh.position.set(
    (Math.random() - 0.5) * 2 * half,
    0,
    (Math.random() - 0.5) * 2 * half
  );
  entity.hp = def.hp;
  entity.maxHp = def.hp;
  entity.ammo = def.ammoMax;
  entity.alive = true;
  entity.mesh.visible = true;
  entity.invulnTimer = 1.5; // Brief invulnerability
  entity.superCharge = 0;
  entity.superReady = false;
  updateHealthBar(entity);
}

// ============== EFFECTS ==============
const particles = [];

function spawnParticles(pos, color, count) {
  const geo = new THREE.SphereGeometry(0.08, 4, 3);
  const mat = new THREE.MeshBasicMaterial({ color });

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.position.y = 0.8;
    game.scene.add(p);
    particles.push({
      mesh: p,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 6 + 2,
      vz: (Math.random() - 0.5) * 8,
      life: 0.5 + Math.random() * 0.5,
    });
  }
}

function showDamageNumber(worldPos, amount) {
  const vec = worldPos.clone();
  vec.y += 2;
  vec.project(game.camera);
  const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;

  const el = document.createElement('div');
  el.className = 'damage-number';
  el.textContent = `-${amount}`;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ============== UPDATE ==============
function updateProjectiles(dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const p = game.projectiles[i];
    p.lifetime -= dt;

    const moveX = p.vx * dt;
    const moveZ = p.vz * dt;
    p.mesh.position.x += moveX;
    p.mesh.position.z += moveZ;
    p.traveled += Math.sqrt(moveX * moveX + moveZ * moveZ);

    // Check obstacle collision
    const hitObs = lineHitsObstacle(
      p.mesh.position.x - moveX, p.mesh.position.z - moveZ,
      p.mesh.position.x, p.mesh.position.z,
      game.arenaData
    );

    let remove = p.lifetime <= 0 || p.traveled > p.maxTravel || hitObs;

    // Check entity collision
    if (!remove) {
      for (const entity of game.entities) {
        if (entity === p.owner || !entity.alive) continue;
        const dx = entity.mesh.position.x - p.mesh.position.x;
        const dz = entity.mesh.position.z - p.mesh.position.z;
        const def = BRAWLER_DEFS[entity.type];
        if (Math.sqrt(dx * dx + dz * dz) < def.bodyRadius + 0.2) {
          dealDamage(entity, p.damage, p.owner);
          remove = true;
          spawnParticles(p.mesh.position, BRAWLER_DEFS[p.type].projectileColor, 5);
          break;
        }
      }
    }

    // Fade out melee
    if (p.type === 'fighter') {
      const scale = 1 + p.traveled * 1.5;
      p.mesh.scale.set(scale, scale, scale);
      p.mesh.children[0].material.opacity = Math.max(0, 1 - p.traveled / p.maxTravel);
    }

    if (remove) {
      game.scene.remove(p.mesh);
      game.projectiles.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.vy -= 15 * dt; // gravity

    if (p.life <= 0 || p.mesh.position.y < 0) {
      game.scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

function updatePlayer(dt) {
  if (!game.player.alive) return;

  const def = BRAWLER_DEFS[game.player.type];
  const pos = game.player.mesh.position;
  let mx = 0, mz = 0;

  if (game.input.w) mz -= 1;
  if (game.input.s) mz += 1;
  if (game.input.a) mx -= 1;
  if (game.input.d) mx += 1;

  if (mx || mz) {
    const len = Math.sqrt(mx * mx + mz * mz);
    mx = (mx / len) * def.speed * dt;
    mz = (mz / len) * def.speed * dt;

    const newPos = checkCollision(pos.x + mx, pos.z + mz, def.bodyRadius, game.arenaData);
    pos.x = newPos.x;
    pos.z = newPos.z;
  }

  // Always face mouse
  const aim = getAimDirection();
  if (aim) {
    game.player.mesh.rotation.y = Math.atan2(aim.x, aim.z);
  }

  // Shoot
  if (game.input.shooting && aim) {
    shoot(game.player, aim.x, aim.z);
  }

  // Super
  if (game.input.super) {
    useSuper(game.player);
  }

  // Reload ammo
  if (game.player.ammo < def.ammoMax) {
    game.player.reloadTimer += dt;
    if (game.player.reloadTimer >= def.reloadTime) {
      game.player.reloadTimer = 0;
      game.player.ammo = Math.min(game.player.ammo + 1, def.ammoMax);
    }
  } else {
    game.player.reloadTimer = 0;
  }

  game.player.attackCooldown = Math.max(0, game.player.attackCooldown - dt);

  // Camera follow
  const camTargetX = pos.x;
  const camTargetZ = pos.z + 14;
  game.camera.position.x += (camTargetX - game.camera.position.x) * 3 * dt;
  game.camera.position.z += (camTargetZ - game.camera.position.z) * 3 * dt;
  game.camera.lookAt(pos.x, 0, pos.z);
}

function updateEntities(dt) {
  for (const entity of game.entities) {
    if (!entity.alive) {
      entity.respawnTimer -= dt;
      if (entity.respawnTimer <= 0) {
        respawnEntity(entity);
      }
      continue;
    }

    // Invulnerability flash
    if (entity.invulnTimer > 0) {
      entity.invulnTimer -= dt;
      entity.mesh.visible = Math.sin(entity.invulnTimer * 20) > 0;
      if (entity.invulnTimer <= 0) entity.mesh.visible = true;
    }

    // Reload
    const def = BRAWLER_DEFS[entity.type];
    if (entity.ammo < def.ammoMax) {
      entity.reloadTimer += dt;
      if (entity.reloadTimer >= def.reloadTime) {
        entity.reloadTimer = 0;
        entity.ammo = Math.min(entity.ammo + 1, def.ammoMax);
      }
    } else {
      entity.reloadTimer = 0;
    }

    entity.attackCooldown = Math.max(0, entity.attackCooldown - dt);

    // Passive HP regen (slow)
    if (entity.hp < def.hp && entity.hp > 0) {
      entity.hp = Math.min(def.hp, entity.hp + def.hp * 0.02 * dt);
      updateHealthBar(entity);
    }
  }
}

function updateHUD() {
  if (!game.player) return;
  const def = BRAWLER_DEFS[game.player.type];

  // Health
  const hpPct = Math.max(0, game.player.hp / game.player.maxHp) * 100;
  document.getElementById('hud-health').style.width = hpPct + '%';
  document.getElementById('hud-health-text').textContent =
    `${Math.max(0, Math.round(game.player.hp))}/${game.player.maxHp}`;

  const hpBar = document.getElementById('hud-health');
  if (hpPct > 50) hpBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
  else if (hpPct > 25) hpBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
  else hpBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';

  // Ammo
  const ammoDiv = document.getElementById('hud-ammo');
  ammoDiv.innerHTML = '';
  for (let i = 0; i < def.ammoMax; i++) {
    const pip = document.createElement('div');
    pip.className = 'ammo-pip';
    if (i < Math.floor(game.player.ammo)) {
      pip.classList.add('filled');
    } else if (i === Math.floor(game.player.ammo) && game.player.ammo % 1 > 0) {
      pip.classList.add('charging');
      const fill = document.createElement('div');
      fill.className = 'ammo-fill';
      fill.style.width = (game.player.reloadTimer / def.reloadTime * 100) + '%';
      pip.appendChild(fill);
    }
    ammoDiv.appendChild(pip);
  }

  // Timer
  const mins = Math.floor(game.gameTime / 60);
  const secs = Math.floor(game.gameTime % 60);
  document.getElementById('hud-timer').textContent =
    `${mins}:${secs.toString().padStart(2, '0')}`;

  // Super indicator
  document.getElementById('hud-name').textContent =
    def.name + (game.player.superReady ? ' [SUPER READY!]' : '');
  document.getElementById('hud-name').style.color =
    game.player.superReady ? '#ffd700' : '#fff';
}

// ============== GAME LOOP ==============
function gameLoop() {
  if (!game.running) return;
  requestAnimationFrame(gameLoop);

  const dt = Math.min(game.clock.getDelta(), 0.05);

  game.gameTime -= dt;
  if (game.gameTime <= 0) {
    endGame(true); // Time's up = survived = victory
    return;
  }

  updatePlayer(dt);

  // AI updates
  for (const ai of game.aiControllers) {
    if (ai.entity.alive) {
      ai.update(dt, game.entities, shoot);
    }
  }

  updateEntities(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  updateHUD();

  game.renderer.render(game.scene, game.camera);
}

// ============== START / END ==============
function startGame(brawlerType) {
  initRenderer();
  game.arenaData = createArena(game.scene);
  game.entities = [];
  game.projectiles = [];
  game.aiControllers = [];
  game.stats = { kills: 0, damage: 0, startTime: Date.now() };
  game.gameTime = 120;
  game.running = true;
  game.clock.start();

  // Create player
  game.player = createEntity(brawlerType, 0, 5, true);
  document.getElementById('hud-name').textContent = BRAWLER_DEFS[brawlerType].name;

  // Create AI bots - one of each type
  const types = Object.keys(BRAWLER_DEFS);
  const spawnPoints = [
    [-12, -12], [12, -12], [-12, 12], [12, 12],
    [0, -15], [0, 15],
  ];

  for (let i = 0; i < 5; i++) {
    const type = types[i % types.length];
    const [sx, sz] = spawnPoints[i];
    const bot = createEntity(type, sx, sz, false);
    game.aiControllers.push(new AIController(bot, game.arenaData));
  }

  setupInput();
  gameLoop();
}

function endGame(victory) {
  game.running = false;
  gameHud.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');

  const title = document.getElementById('gameover-title');
  title.textContent = victory ? 'VICTORY!' : 'DEFEATED';
  title.className = victory ? 'victory' : '';

  document.getElementById('go-kills').textContent = game.stats.kills;
  document.getElementById('go-damage').textContent = game.stats.damage;

  const elapsed = Math.floor((Date.now() - game.stats.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  document.getElementById('go-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function cleanup() {
  game.running = false;
  game.entities = [];
  game.projectiles = [];
  game.aiControllers = [];
  particles.length = 0;

  if (game.renderer) {
    game.renderer.dispose();
    const container = document.getElementById('game-container');
    container.innerHTML = '';
  }

  game.scene = null;
  game.camera = null;
  game.renderer = null;
}
