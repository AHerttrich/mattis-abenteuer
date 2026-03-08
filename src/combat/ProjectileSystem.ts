/**
 * ProjectileSystem — Manages catapult boulders and arrow flight with arc physics.
 */

import * as THREE from 'three';
import { eventBus, Events, CATAPULT_RANGE } from '../utils';
import type { ChunkManager } from '../world/ChunkManager';
import { BlockType } from '../world/BlockType';
import type { ECSWorld } from '../ecs';
import type { PositionComponent, HealthComponent, TeamComponent } from '../ecs/Component';

interface Projectile {
  id: string;
  mesh: THREE.Mesh;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  damage: number;
  blastRadius: number;
  team: 'player' | 'enemy';
  age: number;
  maxAge: number;
}

let nextId = 0;

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private scene: THREE.Scene;
  private chunkManager: ChunkManager;
  private gravity = -15;

  constructor(scene: THREE.Scene, chunkManager: ChunkManager) {
    this.scene = scene;
    this.chunkManager = chunkManager;
  }

  /** Launch a boulder from a catapult. */
  launchBoulder(
    fromX: number, fromY: number, fromZ: number,
    toX: number, toY: number, toZ: number,
    damage: number, team: 'player' | 'enemy',
  ): void {
    const dx = toX - fromX, dz = toZ - fromZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > CATAPULT_RANGE) return;

    // Calculate launch velocity for arc
    const flightTime = dist / 15;
    const vx = dx / flightTime;
    const vz = dz / flightTime;
    const vy = (toY - fromY) / flightTime - 0.5 * this.gravity * flightTime;

    // Create boulder mesh
    const geo = new THREE.SphereGeometry(0.4, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(fromX, fromY + 3, fromZ);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const proj: Projectile = {
      id: `proj_${nextId++}`,
      mesh, x: fromX, y: fromY + 3, z: fromZ,
      vx, vy, vz,
      damage, blastRadius: 3, team,
      age: 0, maxAge: 10,
    };
    this.projectiles.push(proj);

    eventBus.emit(Events.PROJECTILE_LAUNCHED, {
      from: { x: fromX, y: fromY, z: fromZ },
      to: { x: toX, y: toY, z: toZ },
      team,
    });
  }

  /** Launch an arrow (faster, smaller, no AOE). */
  launchArrow(
    fromX: number, fromY: number, fromZ: number,
    toX: number, toY: number, toZ: number,
    damage: number, team: 'player' | 'enemy',
  ): void {
    const dx = toX - fromX, dz = toZ - fromZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const flightTime = dist / 25;
    const vx = dx / flightTime;
    const vz = dz / flightTime;
    const vy = (toY - fromY) / flightTime - 0.5 * this.gravity * flightTime;

    const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(fromX, fromY + 1.5, fromZ);
    this.scene.add(mesh);

    this.projectiles.push({
      id: `arrow_${nextId++}`,
      mesh, x: fromX, y: fromY + 1.5, z: fromZ,
      vx, vy, vz,
      damage, blastRadius: 0, team,
      age: 0, maxAge: 5,
    });
  }

  update(dt: number, ecsWorld?: ECSWorld, getPlayerPos?: () => THREE.Vector3): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      p.age += dt;

      // Physics
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy += this.gravity * dt;

      // Update mesh
      p.mesh.position.set(p.x, p.y, p.z);

      // Rotate arrow to face velocity
      if (p.blastRadius === 0) {
        const vel = new THREE.Vector3(p.vx, p.vy, p.vz).normalize();
        p.mesh.lookAt(p.mesh.position.clone().add(vel));
      } else {
        p.mesh.rotation.x += dt * 5;
        p.mesh.rotation.z += dt * 3;
      }

      // Check entity collisions if this is an arrow (no blast radius)
      if (p.blastRadius === 0 && ecsWorld && getPlayerPos) {
        let hitEntity = false;

        if (p.team === 'enemy') {
          const pPos = getPlayerPos();
          const dist = Math.sqrt(Math.pow(p.x - pPos.x, 2) + Math.pow(p.y - pPos.y, 2) + Math.pow(p.z - pPos.z, 2));
          if (dist < 1.0) {
            eventBus.emit(Events.PLAYER_ATTACKED, { damage: p.damage, pos: { x: p.x, y: p.y, z: p.z } });
            hitEntity = true;
          }
        }

        if (!hitEntity) {
          const entities = ecsWorld.query('position', 'health', 'team');
          for (const entity of entities) {
            const team = entity.getComponent<TeamComponent>('team')!;
            if (team.team === p.team) continue;
            
            const health = entity.getComponent<HealthComponent>('health')!;
            if (health.isDead) continue;
            
            const pos = entity.getComponent<PositionComponent>('position')!;
            const dist = Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - (pos.y + 1), 2) + Math.pow(p.z - pos.z, 2));
            
            if (dist < 1.0) {
              const actualDamage = Math.max(1, Math.round(p.damage - health.armor * 0.5));
              health.current = Math.max(0, health.current - actualDamage);
              eventBus.emit(Events.ENTITY_DAMAGED, { entityId: entity.id, damage: actualDamage, remaining: health.current, pos });
              
              if (health.current <= 0) {
                health.isDead = true;
                eventBus.emit(Events.ENTITY_DIED, { entityId: entity.id, tag: entity.tag, pos });
              }
              hitEntity = true;
              break;
            }
          }
        }

        if (hitEntity) {
          toRemove.push(i);
          continue;
        }
      }

      // Check ground collision
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      const hitBlock = this.chunkManager.getBlockAtWorld(bx, by, bz);

      if (hitBlock !== 0 || p.y < 0 || p.age > p.maxAge) {
        this.onImpact(p, bx, by, bz);
        toRemove.push(i);
      }
    }

    // Remove impacted projectiles in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.projectiles[idx];
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.projectiles.splice(idx, 1);
    }
  }

  private onImpact(proj: Projectile, bx: number, by: number, bz: number): void {
    if (proj.blastRadius > 0) {
      // AOE block destruction (boulder)
      const r = proj.blastRadius;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dz = -r; dz <= r; dz++) {
            if (dx * dx + dy * dy + dz * dz > r * r) continue;
            const wx = bx + dx, wy = by + dy, wz = bz + dz;
            const block = this.chunkManager.getBlockAtWorld(wx, wy, wz) as BlockType;
            if (block !== BlockType.AIR && block !== BlockType.BEDROCK) {
              this.chunkManager.setBlockAtWorld(wx, wy, wz, BlockType.AIR);
            }
          }
        }
      }
      // Emit particles effect event
      eventBus.emit(Events.BLOCK_DESTROYED, {
        x: bx, y: by, z: bz, radius: proj.blastRadius, projectile: true,
      });
    }
  }

  get activeProjectiles(): number { return this.projectiles.length; }

  destroy(): void {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.projectiles = [];
  }
}
