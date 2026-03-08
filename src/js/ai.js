// AI Controller for bot opponents
import { BRAWLER_DEFS } from './brawlers.js';
import { checkCollision, lineHitsObstacle, isInBush } from './arena.js';

const AI_STATES = {
  IDLE: 'idle',
  ROAM: 'roam',
  CHASE: 'chase',
  ATTACK: 'attack',
  RETREAT: 'retreat',
  STRAFE: 'strafe',
};

export class AIController {
  constructor(entity, arenaData) {
    this.entity = entity;
    this.arena = arenaData;
    this.state = AI_STATES.ROAM;
    this.target = null;
    this.roamTarget = this.randomPoint();
    this.stateTimer = 0;
    this.thinkTimer = 0;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.difficulty = 0.4 + Math.random() * 0.4; // 0.4-0.8
  }

  randomPoint() {
    const half = this.arena.size / 2 - 3;
    return {
      x: (Math.random() - 0.5) * 2 * half,
      z: (Math.random() - 0.5) * 2 * half,
    };
  }

  distTo(target) {
    const dx = target.mesh.position.x - this.entity.mesh.position.x;
    const dz = target.mesh.position.z - this.entity.mesh.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  findTarget(entities) {
    let closest = null;
    let closestDist = Infinity;
    const detectRange = 18;

    for (const e of entities) {
      if (e === this.entity || e.hp <= 0) continue;
      const d = this.distTo(e);
      if (d < detectRange && d < closestDist) {
        // Can we see them? (not behind obstacle and not in bush)
        const inBush = isInBush(e.mesh.position.x, e.mesh.position.z, this.arena);
        if (inBush && d > 4) continue; // Can't see targets in bushes beyond 4 units
        closestDist = d;
        closest = e;
      }
    }
    return closest;
  }

  update(dt, entities, shootCallback) {
    const def = BRAWLER_DEFS[this.entity.type];
    this.thinkTimer -= dt;
    this.stateTimer -= dt;

    // Re-evaluate every 0.3-0.6s
    if (this.thinkTimer <= 0) {
      this.thinkTimer = 0.3 + Math.random() * 0.3;
      this.target = this.findTarget(entities);

      if (this.entity.hp < def.hp * 0.25) {
        this.state = AI_STATES.RETREAT;
      } else if (this.target) {
        const dist = this.distTo(this.target);
        if (dist <= def.range * 0.9 && this.entity.ammo >= 1) {
          this.state = Math.random() > 0.4 ? AI_STATES.ATTACK : AI_STATES.STRAFE;
        } else {
          this.state = AI_STATES.CHASE;
        }
      } else {
        this.state = AI_STATES.ROAM;
      }
    }

    let moveX = 0, moveZ = 0;
    const pos = this.entity.mesh.position;
    const speed = def.speed;

    switch (this.state) {
      case AI_STATES.ROAM: {
        const dx = this.roamTarget.x - pos.x;
        const dz = this.roamTarget.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 2) {
          this.roamTarget = this.randomPoint();
        } else {
          moveX = (dx / dist) * speed * dt;
          moveZ = (dz / dist) * speed * dt;
        }
        break;
      }

      case AI_STATES.CHASE: {
        if (!this.target || this.target.hp <= 0) break;
        const dx = this.target.mesh.position.x - pos.x;
        const dz = this.target.mesh.position.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 1) {
          moveX = (dx / dist) * speed * dt;
          moveZ = (dz / dist) * speed * dt;
        }
        // Shoot while chasing if in range
        if (dist < def.range && this.entity.ammo >= 1) {
          this.tryShoot(dx, dz, dist, shootCallback);
        }
        break;
      }

      case AI_STATES.ATTACK: {
        if (!this.target || this.target.hp <= 0) break;
        const dx = this.target.mesh.position.x - pos.x;
        const dz = this.target.mesh.position.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        this.tryShoot(dx, dz, dist, shootCallback);
        break;
      }

      case AI_STATES.STRAFE: {
        if (!this.target || this.target.hp <= 0) break;
        const dx = this.target.mesh.position.x - pos.x;
        const dz = this.target.mesh.position.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Move perpendicular
        moveX = (-dz / dist) * this.strafeDir * speed * 0.7 * dt;
        moveZ = (dx / dist) * this.strafeDir * speed * 0.7 * dt;
        // Occasionally flip direction
        if (Math.random() < 0.01) this.strafeDir *= -1;
        this.tryShoot(dx, dz, dist, shootCallback);
        break;
      }

      case AI_STATES.RETREAT: {
        if (this.target) {
          const dx = pos.x - this.target.mesh.position.x;
          const dz = pos.z - this.target.mesh.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          moveX = (dx / dist) * speed * dt;
          moveZ = (dz / dist) * speed * dt;
        } else {
          // Run to center
          const dx = -pos.x;
          const dz = -pos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 1) {
            moveX = (dx / dist) * speed * dt;
            moveZ = (dz / dist) * speed * dt;
          }
        }
        break;
      }
    }

    // Apply movement with collision
    if (moveX !== 0 || moveZ !== 0) {
      const newPos = checkCollision(
        pos.x + moveX,
        pos.z + moveZ,
        def.bodyRadius,
        this.arena
      );
      pos.x = newPos.x;
      pos.z = newPos.z;

      // Face movement direction
      const angle = Math.atan2(moveX, moveZ);
      this.entity.mesh.rotation.y = angle;
    }

    // Face target when attacking
    if (this.target && (this.state === AI_STATES.ATTACK || this.state === AI_STATES.STRAFE)) {
      const dx = this.target.mesh.position.x - pos.x;
      const dz = this.target.mesh.position.z - pos.z;
      this.entity.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  tryShoot(dx, dz, dist, shootCallback) {
    const def = BRAWLER_DEFS[this.entity.type];
    if (this.entity.ammo < 1) return;
    if (this.entity.attackCooldown > 0) return;
    if (dist > def.range * 1.1) return;

    // Check line of sight
    const blocked = lineHitsObstacle(
      this.entity.mesh.position.x, this.entity.mesh.position.z,
      this.entity.mesh.position.x + dx, this.entity.mesh.position.z + dz,
      this.arena
    );
    if (blocked) return;

    // Add inaccuracy based on difficulty
    const inaccuracy = (1 - this.difficulty) * 0.3;
    const aimDx = dx / dist + (Math.random() - 0.5) * inaccuracy;
    const aimDz = dz / dist + (Math.random() - 0.5) * inaccuracy;
    const aimLen = Math.sqrt(aimDx * aimDx + aimDz * aimDz);

    shootCallback(this.entity, aimDx / aimLen, aimDz / aimLen);
  }
}
