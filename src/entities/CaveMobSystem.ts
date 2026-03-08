/**
 * CaveMobSystem — Spawns and controls hostile cave mobs.
 *
 * Skeletons and spiders spawn in dark underground areas near the player.
 * They wander when idle and chase the player if within detection range.
 * Killing them drops bones, string, and occasionally rare gems.
 */

import * as THREE from 'three';
import { ECSWorld, Entity, createPosition, createVelocity, createHealth, createCombat, createTeam, createAI } from '../ecs';
import type { PositionComponent, HealthComponent, AIComponent } from '../ecs/Component';
import { AIState } from '../ecs/Component';
import { CombatSystem } from '../combat/CombatSystem';
import { eventBus, Events } from '../utils';
import type { ChunkManager } from '../world/ChunkManager';
import { isBlockSolid, BlockType } from '../world/BlockType';

export enum CaveMobType {
  SKELETON = 'skeleton',
  SPIDER = 'spider',
}

const MOB_STATS: Record<string, { hp: number; damage: number; speed: number; range: number; color: number }> = {
  [CaveMobType.SKELETON]: { hp: 30, damage: 6, speed: 2.5, range: 2.0, color: 0xccccaa },
  [CaveMobType.SPIDER]:   { hp: 20, damage: 4, speed: 4.0, range: 1.5, color: 0x333333 },
};

const MOB_DROPS: Record<string, { itemId: string; count: number; chance: number }[]> = {
  [CaveMobType.SKELETON]: [
    { itemId: 'bone', count: 2, chance: 1.0 },
    { itemId: 'coal', count: 1, chance: 0.4 },
    { itemId: 'iron_ingot', count: 1, chance: 0.1 },
  ],
  [CaveMobType.SPIDER]: [
    { itemId: 'string', count: 2, chance: 1.0 },
    { itemId: 'crystal', count: 1, chance: 0.05 },
  ],
};

interface CaveMob {
  entity: Entity;
  type: CaveMobType;
  mesh: THREE.Group;
}

export class CaveMobSystem {
  private ecsWorld: ECSWorld;
  private scene: THREE.Scene;
  private combat: CombatSystem;
  private chunkManager: ChunkManager;
  private mobs: CaveMob[] = [];
  private spawnTimer = 0;
  private maxMobs = 12;
  private spawnInterval = 8; // seconds
  private detectionRange = 8;

  // Reward callback
  private dropCallback: ((drops: { itemId: string; count: number }[]) => void) | null = null;

  constructor(ecsWorld: ECSWorld, scene: THREE.Scene, combat: CombatSystem, chunkManager: ChunkManager) {
    this.ecsWorld = ecsWorld;
    this.scene = scene;
    this.combat = combat;
    this.chunkManager = chunkManager;

    eventBus.on(Events.ENTITY_DIED, (data: unknown) => {
      const { entityId } = data as { entityId: string };
      const mobIdx = this.mobs.findIndex(m => m.entity.id === entityId);
      if (mobIdx >= 0) {
        const mob = this.mobs[mobIdx];
        this.awardDrops(mob.type);
        this.removeMob(mobIdx);
      }
    });
  }

  onDrop(cb: (drops: { itemId: string; count: number }[]) => void): void {
    this.dropCallback = cb;
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number): void {
    // Spawn near player if underground
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.mobs.length < this.maxMobs) {
      this.spawnTimer = this.spawnInterval;
      this.trySpawnNearPlayer(playerX, playerY, playerZ);
    }

    // Update mob AI
    for (const mob of this.mobs) {
      const pos = mob.entity.getComponent<PositionComponent>('position')!;
      const health = mob.entity.getComponent<HealthComponent>('health')!;
      const ai = mob.entity.getComponent<AIComponent>('ai')!;
      if (health.isDead) continue;

      const dist = Math.sqrt((pos.x - playerX) ** 2 + (pos.z - playerZ) ** 2);
      const stats = MOB_STATS[mob.type];

      if (dist < stats.range + 0.5 && ai.state !== AIState.ATTACK) {
        ai.state = AIState.ATTACK;
      } else if (dist < this.detectionRange && ai.state !== AIState.ATTACK) {
        ai.state = AIState.CHASE;
      } else if (dist > this.detectionRange * 1.5) {
        ai.state = AIState.PATROL;
      }

      // Move toward player when chasing/attacking
      if (ai.state === AIState.CHASE || ai.state === AIState.ATTACK) {
        const dx = playerX - pos.x;
        const dz = playerZ - pos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const speed = stats.speed * dt;
        const nx = pos.x + (dx / len) * speed;
        const nz = pos.z + (dz / len) * speed;
        if (!this.isSolidAt(Math.floor(nx), Math.floor(pos.y), Math.floor(pos.z))) pos.x = nx;
        if (!this.isSolidAt(Math.floor(pos.x), Math.floor(pos.y), Math.floor(nz))) pos.z = nz;
      } else {
        // Wander randomly
        const t = Date.now() * 0.001 + parseInt(mob.entity.id, 36) * 0.1;
        pos.x += Math.sin(t) * 0.5 * dt;
        pos.z += Math.cos(t * 1.3) * 0.5 * dt;
      }

      // Gravity snap
      this.snapToGround(pos);

      // Attack player
      if (ai.state === AIState.ATTACK && dist < stats.range + 0.5) {
        this.combat.meleeAttack(mob.entity.id, 'player-entity');
      }

      // Update mesh
      mob.mesh.position.set(pos.x, pos.y, pos.z);
      // Face player when chasing
      if (ai.state === AIState.CHASE || ai.state === AIState.ATTACK) {
        mob.mesh.rotation.y = Math.atan2(playerX - pos.x, playerZ - pos.z);
      }
    }

    // Despawn mobs far from player
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const pos = this.mobs[i].entity.getComponent<PositionComponent>('position')!;
      const dist = Math.sqrt((pos.x - playerX) ** 2 + (pos.z - playerZ) ** 2);
      if (dist > 60) this.removeMob(i);
    }
  }

  private trySpawnNearPlayer(px: number, py: number, pz: number): void {
    // Only spawn if player is underground (has solid blocks above)
    const headY = Math.floor(py + 2);
    let hasRoof = false;
    for (let y = headY; y < headY + 10; y++) {
      if (this.isSolidAt(Math.floor(px), y, Math.floor(pz))) { hasRoof = true; break; }
    }
    if (!hasRoof) return;

    // Try a random offset 12-20 blocks away
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 8;
    const sx = Math.floor(px + Math.cos(angle) * dist);
    const sz = Math.floor(pz + Math.sin(angle) * dist);
    let sy = Math.floor(py);

    // Find ground
    while (sy > 1 && !this.isSolidAt(sx, sy - 1, sz)) sy--;
    if (sy <= 1) return;

    // Must be dark (underground)
    let roofAbove = false;
    for (let y = sy; y < sy + 10; y++) {
      if (this.isSolidAt(sx, y, sz)) { roofAbove = true; break; }
    }
    if (!roofAbove) return;

    const type = Math.random() < 0.6 ? CaveMobType.SKELETON : CaveMobType.SPIDER;
    this.spawnMob(type, sx + 0.5, sy, sz + 0.5);
  }

  private spawnMob(type: CaveMobType, x: number, y: number, z: number): void {
    const stats = MOB_STATS[type];
    const entity = new Entity('cave_mob');
    entity
      .addComponent(createPosition(x, y, z))
      .addComponent(createVelocity())
      .addComponent(createHealth(stats.hp))
      .addComponent(createCombat(stats.damage, 1.2, stats.range))
      .addComponent(createTeam('enemy'))
      .addComponent(createAI(5, 8, 12));

    const ai = entity.getComponent<AIComponent>('ai')!;
    ai.state = AIState.PATROL;
    ai.patrolOrigin = { x, y, z };

    this.ecsWorld.addEntity(entity);

    // Create mesh
    const group = new THREE.Group();
    const bodyH = type === CaveMobType.SPIDER ? 0.4 : 1.0;
    const bodyW = type === CaveMobType.SPIDER ? 0.8 : 0.4;
    const geo = new THREE.BoxGeometry(bodyW, bodyH, bodyW);
    const mat = new THREE.MeshStandardMaterial({ color: stats.color, roughness: 0.8 });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = bodyH / 2;
    body.castShadow = true;
    group.add(body);

    // Eyes (glowing red)
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(-0.1, bodyH * 0.7, bodyW / 2 + 0.01);
    eye2.position.set(0.1, bodyH * 0.7, bodyW / 2 + 0.01);
    group.add(eye1, eye2);

    if (type === CaveMobType.SPIDER) {
      // Legs
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.3, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
          );
          leg.position.set(side * 0.45, 0.1, (i - 1) * 0.25);
          leg.rotation.z = side * 0.6;
          group.add(leg);
        }
      }
    }

    this.scene.add(group);
    this.mobs.push({ entity, type, mesh: group });
  }

  private removeMob(idx: number): void {
    const mob = this.mobs[idx];
    this.scene.remove(mob.mesh);
    mob.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    this.ecsWorld.removeEntity(mob.entity.id);
    this.mobs.splice(idx, 1);
  }

  private awardDrops(type: CaveMobType): void {
    const drops = (MOB_DROPS[type] ?? [])
      .filter(d => Math.random() < d.chance)
      .map(d => ({ itemId: d.itemId, count: d.count }));
    if (drops.length > 0 && this.dropCallback) {
      this.dropCallback(drops);
    }
  }

  private isSolidAt(x: number, y: number, z: number): boolean {
    const block = this.chunkManager.getBlockAtWorld(x, y, z);
    return block !== undefined && isBlockSolid(block as BlockType);
  }

  private snapToGround(pos: PositionComponent): void {
    const bx = Math.floor(pos.x), bz = Math.floor(pos.z);
    let gy = Math.floor(pos.y);
    while (gy > 0 && !this.isSolidAt(bx, gy - 1, bz)) gy--;
    pos.y += (gy - pos.y) * 0.3;
  }

  get mobCount(): number { return this.mobs.length; }
}
