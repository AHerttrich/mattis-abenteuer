/**
 * WarriorManager — Spawns, renders, moves, and controls warrior entities.
 * Warriors are 3D box-shaped entities that march between castles and fight.
 */

import * as THREE from 'three';
import { ECSWorld, Entity, createPosition, createVelocity, createHealth, createCombat, createTeam, createAI, createWarrior } from '../ecs';
import { AIState, WarriorType } from '../ecs/Component';
import type { PositionComponent, HealthComponent, AIComponent, TeamComponent } from '../ecs/Component';
import { CombatSystem } from '../combat/CombatSystem';
import { eventBus, Events, GUARD_PATROL_RADIUS, GUARD_ALERT_RADIUS, GUARD_CHASE_RADIUS } from '../utils';
import { AIStateMachine } from '../ai/AIStateMachine';
import type { AIContext } from '../ai/AIStateMachine';
import { PathFinder } from '../ai/PathFinder';
import type { ChunkManager } from '../world/ChunkManager';
import { isBlockSolid } from '../world/BlockType';

interface WarriorMesh {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  healthBar: THREE.Sprite;
  healthBarCanvas: HTMLCanvasElement;
  healthBarCtx: CanvasRenderingContext2D;
}

/** Create a canvas-based floating health bar sprite */
function createHealthBarSprite(): { sprite: THREE.Sprite; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.0, 0.12, 1);
  return { sprite, canvas, ctx };
}

const WARRIOR_COLORS: Record<string, { player: number; enemy: number }> = {
  [WarriorType.SWORDSMAN]: { player: 0x3498db, enemy: 0xe74c3c },
  [WarriorType.ARCHER]: { player: 0x2ecc71, enemy: 0xe67e22 },
  [WarriorType.CAVALRY]: { player: 0x9b59b6, enemy: 0xc0392b },
  [WarriorType.CATAPULT_OPERATOR]: { player: 0xf1c40f, enemy: 0x8b0000 },
  [WarriorType.SHIELD_BEARER]: { player: 0x2874a6, enemy: 0xa93226 },
  [WarriorType.CASTLE_BOSS]: { player: 0xffd700, enemy: 0x300030 },
};

const WARRIOR_STATS: Record<string, { hp: number; damage: number; speed: number; range: number }> = {
  [WarriorType.SWORDSMAN]: { hp: 60, damage: 8, speed: 3.0, range: 2.0 },
  [WarriorType.ARCHER]: { hp: 40, damage: 6, speed: 3.5, range: 12.0 },
  [WarriorType.CAVALRY]: { hp: 80, damage: 12, speed: 5.0, range: 2.5 },
  [WarriorType.CATAPULT_OPERATOR]: { hp: 50, damage: 25, speed: 1.5, range: 30.0 },
  [WarriorType.SHIELD_BEARER]: { hp: 120, damage: 6, speed: 2.0, range: 2.0 },
  [WarriorType.CASTLE_BOSS]: { hp: 500, damage: 20, speed: 2.5, range: 3.5 },
};

export class WarriorManager {
  private ecsWorld: ECSWorld;
  private scene: THREE.Scene;
  private meshes = new Map<string, WarriorMesh>();
  private combat: CombatSystem;
  private aiSM = new AIStateMachine();
  private enemyCastlePos: { x: number; z: number } | null = null;
  private playerCastlePos: { x: number; z: number } | null = null;
  private chunkManager: ChunkManager;
  private pathFinder: PathFinder;
  private paths = new Map<string, { waypoints: { x: number; y: number; z: number }[]; index: number; repathTimer: number }>();
  private lastPositions = new Map<string, { x: number; z: number; stuckTimer: number }>();

  constructor(ecsWorld: ECSWorld, scene: THREE.Scene, combat: CombatSystem, chunkManager: ChunkManager) {
    this.ecsWorld = ecsWorld;
    this.scene = scene;
    this.combat = combat;
    this.chunkManager = chunkManager;
    this.pathFinder = new PathFinder((x, y, z) => {
      const block = chunkManager.getBlockAtWorld(x, y, z);
      return block !== undefined && isBlockSolid(block);
    });

    eventBus.on(Events.ENTITY_DIED, (data: unknown) => {
      const { entityId } = data as { entityId: string };
      this.removeWarrior(entityId);
    });
  }

  setEnemyCastlePos(x: number, z: number): void { this.enemyCastlePos = { x, z }; }
  setPlayerCastlePos(x: number, z: number): void { this.playerCastlePos = { x, z }; }

  /** Spawn a warrior entity with 3D mesh. */
  spawnWarrior(type: WarriorType, team: 'player' | 'enemy', x: number, y: number, z: number, sourceCastleId: string, targetCastleId: string): Entity {
    const stats = WARRIOR_STATS[type];
    const colors = WARRIOR_COLORS[type];
    const color = team === 'player' ? colors.player : colors.enemy;

    // Random spawn offset ±2 blocks so warriors don't stack
    const ox = (Math.random() - 0.5) * 4;
    const oz = (Math.random() - 0.5) * 4;
    const sx = x + ox;
    const sz = z + oz;

    const entity = new Entity('warrior');
    entity
      .addComponent(createPosition(sx, y, sz))
      .addComponent(createVelocity())
      .addComponent(createHealth(stats.hp))
      .addComponent(createCombat(stats.damage, 1.0, stats.range))
      .addComponent(createTeam(team))
      .addComponent(createAI(GUARD_PATROL_RADIUS, GUARD_ALERT_RADIUS, GUARD_CHASE_RADIUS))
      .addComponent(createWarrior(type, sourceCastleId, targetCastleId));

    // Set AI initial state
    const ai = entity.getComponent<AIComponent>('ai')!;
    if (team === 'player') {
      ai.state = AIState.MARCH;
    } else {
      ai.state = AIState.PATROL;
      ai.patrolOrigin = { x: sx, y, z: sz };
    }

    this.ecsWorld.addEntity(entity);
    this.createMesh(entity.id, color, type);
    return entity;
  }

  private createMesh(entityId: string, color: number, type: WarriorType): void {
    const group = new THREE.Group();

    // Body
    const bodyH = type === WarriorType.CAVALRY ? 1.2 : 0.9;
    const bodyGeo = new THREE.BoxGeometry(0.5, bodyH, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodyH / 2 + 0.1;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = bodyH + 0.3;
    head.castShadow = true;
    group.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.7, 0.2);
    const armMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, bodyH / 2 + 0.2, 0);
    leftArm.geometry.translate(0, -0.35, 0); // pivot at top
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat.clone());
    rightArm.position.set(0.35, bodyH / 2 + 0.2, 0);
    rightArm.geometry.translate(0, -0.35, 0);
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.5, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.25, 0);
    leftLeg.geometry.translate(0, -0.25, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat.clone());
    rightLeg.position.set(0.12, 0.25, 0);
    rightLeg.geometry.translate(0, -0.25, 0);
    group.add(rightLeg);

    // Weapon indicator
    if (type === WarriorType.SWORDSMAN || type === WarriorType.CAVALRY) {
      const swordGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
      const swordMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 });
      const sword = new THREE.Mesh(swordGeo, swordMat);
      sword.position.set(0.35, 0.7, 0);
      sword.rotation.z = 0.3;
      group.add(sword);
    }

    if (type === WarriorType.ARCHER) {
      const bowGeo = new THREE.BoxGeometry(0.05, 0.5, 0.05);
      const bowMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const bow = new THREE.Mesh(bowGeo, bowMat);
      bow.position.set(0.3, 0.7, 0);
      group.add(bow);
    }

    if (type === WarriorType.SHIELD_BEARER) {
      // Sword
      const swordGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
      const swordMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 });
      const sword = new THREE.Mesh(swordGeo, swordMat);
      sword.position.set(0.35, 0.7, 0);
      sword.rotation.z = 0.3;
      group.add(sword);
      
      // Shield
      const shieldGeo = new THREE.BoxGeometry(0.1, 0.8, 0.6);
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.3 });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0, 0.6, 0.3); // In front of body
      group.add(shield);
    }

    // Team banner on back
    const bannerGeo = new THREE.PlaneGeometry(0.2, 0.3);
    const bannerColor = color;
    const bannerMat = new THREE.MeshStandardMaterial({ color: bannerColor, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, bodyH + 0.5, -0.25);
    group.add(banner);

    if (type === WarriorType.CASTLE_BOSS) {
      group.scale.set(1.8, 1.8, 1.8);
      
      // Giant hammer/mace
      const maceGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
      const maceMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const mace = new THREE.Mesh(maceGeo, maceMat);
      mace.position.set(0.6, 0.8, 0);
      mace.rotation.z = Math.PI / 4;
      
      const headGeo = new THREE.DodecahedronGeometry(0.3);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const maceHead = new THREE.Mesh(headGeo, headMat);
      maceHead.position.set(0, 0.6, 0);
      mace.add(maceHead);
      
      group.add(mace);
    }

    this.scene.add(group);
    const hpBar = createHealthBarSprite();
    hpBar.sprite.position.y = (type === WarriorType.CASTLE_BOSS ? 3.5 : 1.7);
    group.add(hpBar.sprite);
    this.meshes.set(entityId, { group, body, head, leftArm, rightArm, leftLeg, rightLeg, healthBar: hpBar.sprite, healthBarCanvas: hpBar.canvas, healthBarCtx: hpBar.ctx });
  }

  /** Update all warriors — AI decisions, movement, and combat. */
  update(dt: number): void {
    const warriors = this.ecsWorld.query('position', 'health', 'ai', 'warrior', 'team');

    for (const warrior of warriors) {
      const pos = warrior.getComponent<PositionComponent>('position')!;
      const health = warrior.getComponent<HealthComponent>('health')!;
      const ai = warrior.getComponent<AIComponent>('ai')!;
      const team = warrior.getComponent<TeamComponent>('team')!;

      if (health.isDead) continue;

      // Find nearest enemy
      const nearestEnemy = this.combat.findNearestEnemy(warrior, ai.chaseRadius);
      const enemyDist = nearestEnemy ? this.dist(pos, nearestEnemy.getComponent<PositionComponent>('position')!) : null;

      // Target castle position
      const targetCastle = team.team === 'player' ? this.enemyCastlePos : this.playerCastlePos;

      // AI update
      const combatComp = warrior.getComponent<import('../ecs/Component').CombatComponent>('combat')!
      const wComp = warrior.getComponent<import('../ecs/Component').WarriorComponent>('warrior')!;
      const nearestEnemyPos = nearestEnemy ? { x: nearestEnemy.getComponent<PositionComponent>('position')!.x, z: nearestEnemy.getComponent<PositionComponent>('position')!.z } : undefined;
      const ctx: AIContext = {
        position: pos, ai, health,
        attackRange: combatComp.range,
        nearestEnemyDist: enemyDist,
        nearestEnemyId: nearestEnemy?.id ?? null,
        nearestEnemyPos,
        isArcher: wComp.warriorType === WarriorType.ARCHER,
        targetCastleX: targetCastle?.x,
        targetCastleZ: targetCastle?.z,
      };
      this.aiSM.update(dt, ctx);

      // Movement based on AI state
      const speed = WARRIOR_STATS[warrior.getComponent<import('../ecs/Component').WarriorComponent>('warrior')!.warriorType]?.speed ?? 3;

      if (ai.state === AIState.MARCH && targetCastle) {
        this.moveToward(pos, warrior.id, targetCastle.x, targetCastle.z, speed, dt);
      } else if (ai.state === AIState.CHASE && nearestEnemy) {
        const ePos = nearestEnemy.getComponent<PositionComponent>('position')!;
        this.moveToward(pos, warrior.id, ePos.x, ePos.z, speed, dt);
      } else if (ai.state === AIState.ATTACK && nearestEnemy) {
        if (warrior.getComponent<import('../ecs/Component').WarriorComponent>('warrior')!.warriorType === WarriorType.ARCHER) {
          const combatState = warrior.getComponent<import('../ecs/Component').CombatComponent>('combat')!;
          if (Date.now() / 1000 - combatState.lastAttackTime >= 1.5) { // 1.5s cooldown
            combatState.lastAttackTime = Date.now() / 1000;
            const ePos = nearestEnemy.getComponent<PositionComponent>('position')!;
            eventBus.emit(Events.ARROW_FIRED, {
              from: { x: pos.x, y: pos.y + 0.5, z: pos.z },
              to: { x: ePos.x, y: ePos.y + 1, z: ePos.z },
              damage: combatState.damage,
              team: team.team
            });
            // Face target fully
            const angle = Math.atan2(ePos.x - pos.x, ePos.z - pos.z);
            const mesh = this.meshes.get(warrior.id);
            if (mesh) mesh.group.rotation.y = angle;
          }
        } else {
          this.combat.meleeAttack(warrior.id, nearestEnemy.id);
        }
      } else if (ai.state === AIState.PATROL && ai.patrolOrigin) {
        const angle = (Date.now() * 0.0003) % (Math.PI * 2);
        const tx = ai.patrolOrigin.x + Math.cos(angle) * ai.patrolRadius * 0.5;
        const tz = ai.patrolOrigin.z + Math.sin(angle) * ai.patrolRadius * 0.5;
        this.moveToward(pos, warrior.id, tx, tz, speed * 0.3, dt);
      } else if ((ai.state === AIState.FLEE || ai.state === AIState.RETREAT) && nearestEnemy) {
        // Move away from nearest enemy
        const ePos = nearestEnemy.getComponent<PositionComponent>('position')!;
        const dx = pos.x - ePos.x;
        const dz = pos.z - ePos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const fleeX = pos.x + (dx / len) * 10;
        const fleeZ = pos.z + (dz / len) * 10;
        this.moveToward(pos, warrior.id, fleeX, fleeZ, speed * 1.2, dt);
      }

      // Apply gravity to snap to terrain
      this.applyGravity(pos);

      // Update mesh
      const mesh = this.meshes.get(warrior.id);
      if (mesh) {
        mesh.group.position.set(pos.x, pos.y, pos.z);

        // Walk animation when moving
        if (ai.state === AIState.MARCH || ai.state === AIState.CHASE) {
          const walkCycle = Date.now() * 0.008;
          mesh.body.position.y = 0.55 + Math.sin(walkCycle) * 0.05;
          // Arm swing (opposite phase)
          mesh.leftArm.rotation.x = Math.sin(walkCycle) * 0.6;
          mesh.rightArm.rotation.x = -Math.sin(walkCycle) * 0.6;
          // Leg swing (opposite to arms)
          mesh.leftLeg.rotation.x = -Math.sin(walkCycle) * 0.5;
          mesh.rightLeg.rotation.x = Math.sin(walkCycle) * 0.5;
        } else if (ai.state === AIState.ATTACK) {
          // Attack animation: weapon arm swings forward
          const attackCycle = Date.now() * 0.012;
          mesh.rightArm.rotation.x = Math.sin(attackCycle) * 1.0;
          mesh.leftArm.rotation.x = 0;
          mesh.leftLeg.rotation.x = 0;
          mesh.rightLeg.rotation.x = 0;
        } else {
          // Idle: reset limbs
          mesh.leftArm.rotation.x = 0;
          mesh.rightArm.rotation.x = 0;
          mesh.leftLeg.rotation.x = 0;
          mesh.rightLeg.rotation.x = 0;
        }

        // Face movement direction
        if (ai.state !== AIState.IDLE) {
          const target = ai.state === AIState.MARCH && targetCastle ? targetCastle : nearestEnemy ? { x: nearestEnemy.getComponent<PositionComponent>('position')!.x, z: nearestEnemy.getComponent<PositionComponent>('position')!.z } : null;
          if (target) {
            const angle = Math.atan2(target.x - pos.x, target.z - pos.z);
            mesh.group.rotation.y = angle;
          }
        }

        // Update floating health bar
        const hpRatio = health.current / health.max;
        const ctx = mesh.healthBarCtx;
        const w = mesh.healthBarCanvas.width;
        const h = mesh.healthBarCanvas.height;
        ctx.clearRect(0, 0, w, h);
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, w, h);
        // HP fill
        const barColor = hpRatio > 0.5 ? `rgb(${Math.round(255 * (1 - hpRatio) * 2)},${Math.round(200 + 55 * hpRatio)},60)`
          : `rgb(255,${Math.round(200 * hpRatio * 2)},30)`;
        ctx.fillStyle = barColor;
        ctx.fillRect(1, 1, (w - 2) * hpRatio, h - 2);
        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
        // Update texture
        (mesh.healthBar.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        // Counter-rotate health bar so it always faces camera
        mesh.healthBar.material.rotation = -mesh.group.rotation.y;

        // Health-based color tint (flash red when damaged)
        if (hpRatio < 0.3) {
          (mesh.body.material as THREE.MeshStandardMaterial).emissive.setHex(0x330000);
        } else {
          (mesh.body.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }
      }
    }
  }

  /** Watchtower auto-shoot: fire arrows at nearby enemies every 2.5s. */
  updateTowerAutoShoot(castle: import('../castle/Castle').Castle, _dt: number): void {
    const TOWER_RANGE = 15;
    const TOWER_COOLDOWN = 2.5;
    const TOWER_DAMAGE = 8;
    for (const bld of castle.buildings) {
      if (bld.type !== 'watchtower' || bld.hp <= 0) continue;
      if (Date.now() / 1000 - bld.lastSpawnTime < TOWER_COOLDOWN) continue;

      const enemies = this.ecsWorld.query('position', 'health', 'team');
      let closest: { x: number; y: number; z: number } | null = null;
      let closestDist = TOWER_RANGE;
      for (const e of enemies) {
        const team = e.getComponent<TeamComponent>('team')!;
        if (team.team === castle.owner) continue;
        const ePos = e.getComponent<PositionComponent>('position')!;
        const eHp = e.getComponent<HealthComponent>('health')!;
        if (eHp.isDead) continue;
        const dx = ePos.x - bld.x, dz = ePos.z - bld.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < closestDist) { closestDist = d; closest = { x: ePos.x, y: ePos.y + 1, z: ePos.z }; }
      }

      if (closest) {
        bld.lastSpawnTime = Date.now() / 1000;
        eventBus.emit(Events.ARROW_FIRED, {
          from: { x: bld.x, y: bld.y + 4, z: bld.z },
          to: closest,
          damage: TOWER_DAMAGE,
          team: castle.owner,
        });
      }
    }
  }

  /** Find terrain height at a given XZ by scanning downward. */
  private getTerrainY(x: number, z: number): number {
    const bx = Math.floor(x), bz = Math.floor(z);
    // Scan down from a generous height
    for (let y = 60; y > 0; y--) {
      if (this.isSolidAt(bx, y, bz) && !this.isSolidAt(bx, y + 1, bz)) {
        return y + 1;
      }
    }
    return 0;
  }

  private moveToward(pos: PositionComponent, entityId: string, tx: number, tz: number, speed: number, dt: number): void {
    // ── Stuck detection ─────────────────────────────────────────
    let lastPos = this.lastPositions.get(entityId);
    if (!lastPos) {
      lastPos = { x: pos.x, z: pos.z, stuckTimer: 0 };
      this.lastPositions.set(entityId, lastPos);
    }
    const movedDist = Math.sqrt((pos.x - lastPos.x) ** 2 + (pos.z - lastPos.z) ** 2);
    if (movedDist < 0.1) {
      lastPos.stuckTimer += dt;
    } else {
      lastPos.stuckTimer = 0;
      lastPos.x = pos.x;
      lastPos.z = pos.z;
    }
    const isStuck = lastPos.stuckTimer > 0.5;

    // ── Get or compute path ─────────────────────────────────────
    let pathData = this.paths.get(entityId);
    if (!pathData || pathData.repathTimer <= 0 || isStuck) {
      // Use actual terrain height as goal Y instead of start Y
      const goalY = this.getTerrainY(tx, tz);
      const path = this.pathFinder.findPath(
        Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z),
        Math.floor(tx), goalY, Math.floor(tz)
      );
      if (path && path.length > 1) {
        pathData = { waypoints: path, index: 1, repathTimer: 3.0 };
        this.paths.set(entityId, pathData);
      } else {
        // Fallback: simple direct move
        this.simpleMoveToward(pos, tx, tz, speed * dt);
        if (pathData) pathData.repathTimer = 1.5;
        if (isStuck) lastPos.stuckTimer = 0;
        return;
      }
      if (isStuck) lastPos.stuckTimer = 0;
    }
    pathData.repathTimer -= dt;

    // ── Follow waypoints ────────────────────────────────────────
    if (pathData.index < pathData.waypoints.length) {
      const wp = pathData.waypoints[pathData.index];

      // Waypoint collision guard: if the waypoint is now inside a solid block, invalidate path
      if (this.isSolidAt(wp.x, wp.y, wp.z) || this.isSolidAt(wp.x, wp.y + 1, wp.z)) {
        pathData.repathTimer = 0; // force repath next frame
        return;
      }

      const dx = (wp.x + 0.5) - pos.x;
      const dz = (wp.z + 0.5) - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.3) {
        // Snap Y to waypoint (handles step up/down)
        pos.y = wp.y;
        pathData.index++;
      } else {
        const step = Math.min(speed * dt, dist);
        const nextX = pos.x + (dx / dist) * step;
        const nextZ = pos.z + (dz / dist) * step;

        // Check movement won't go inside a solid block
        const by = Math.floor(pos.y);
        if (!this.isSolidAt(Math.floor(nextX), by, Math.floor(nextZ)) &&
            !this.isSolidAt(Math.floor(nextX), by + 1, Math.floor(nextZ))) {
          pos.x = nextX;
          pos.z = nextZ;
        } else {
          // Movement blocked — force repath
          pathData.repathTimer = 0;
          return;
        }
        // Smoothly adjust Y toward waypoint
        pos.y += (wp.y - pos.y) * 0.3;
      }
    } else {
      // Reached end of path
      pathData.repathTimer = 0;
    }
  }

  /** Fallback direct movement — respects solid blocks (walls). */
  private simpleMoveToward(pos: PositionComponent, tx: number, tz: number, maxDist: number): void {
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.5) return;
    const step = Math.min(maxDist, dist);
    const nx = pos.x + (dx / dist) * step;
    const nz = pos.z + (dz / dist) * step;
    // Check at body level (feet + head) — use ceil to get the actual body block
    const feetY = Math.floor(pos.y);
    const headY = feetY + 1;
    // Move X axis if not blocked
    if (!this.isSolidAt(Math.floor(nx), feetY, Math.floor(pos.z)) &&
        !this.isSolidAt(Math.floor(nx), headY, Math.floor(pos.z))) {
      pos.x = nx;
    }
    // Move Z axis if not blocked
    if (!this.isSolidAt(Math.floor(pos.x), feetY, Math.floor(nz)) &&
        !this.isSolidAt(Math.floor(pos.x), headY, Math.floor(nz))) {
      pos.z = nz;
    }
  }

  /** Apply gravity — snap warrior to terrain surface each frame */
  private applyGravity(pos: PositionComponent): void {
    const bx = Math.floor(pos.x), bz = Math.floor(pos.z);
    // Find ground: check downward from current pos
    let gy = Math.floor(pos.y);
    // If inside solid, push up
    while (gy < pos.y + 5 && this.isSolidAt(bx, gy, bz)) gy++;
    // If floating, push down
    while (gy > 0 && !this.isSolidAt(bx, gy - 1, bz)) gy--;
    // Smooth snap
    pos.y += (gy - pos.y) * 0.25;
  }

  private isSolidAt(x: number, y: number, z: number): boolean {
    const block = this.chunkManager.getBlockAtWorld(x, y, z);
    return block !== undefined && isBlockSolid(block);
  }

  removeWarrior(entityId: string): void {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      // Death animation: shrink + fade over 0.4s
      const startTime = Date.now();
      const duration = 400; // ms
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const scale = 1 - t;
        mesh.group.scale.setScalar(scale);
        mesh.group.position.y -= 0.02; // sink slightly
        mesh.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.transparent = true;
            mat.opacity = 1 - t;
          }
        });
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.scene.remove(mesh.group);
          mesh.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              (child.material as THREE.Material).dispose();
            }
          });
          this.meshes.delete(entityId);
        }
      };
      animate();
    }
    this.ecsWorld.removeEntity(entityId);
  }

  private dist(a: PositionComponent, b: PositionComponent): number {
    const dx = a.x - b.x, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  get warriorCount(): number { return this.meshes.size; }

  // ── Network sync (co-op multiplayer) ─────────────────────────

  /** Host: serialize all warrior positions/health for network broadcast. */
  getAllWarriorState(): { id: string; type: string; team: string; x: number; y: number; z: number; rotY: number; hp: number; maxHp: number; state: string }[] {
    const warriors = this.ecsWorld.query('position', 'health', 'ai', 'warrior', 'team');
    const result: { id: string; type: string; team: string; x: number; y: number; z: number; rotY: number; hp: number; maxHp: number; state: string }[] = [];
    for (const w of warriors) {
      const pos = w.getComponent<PositionComponent>('position')!;
      const health = w.getComponent<HealthComponent>('health')!;
      const ai = w.getComponent<AIComponent>('ai')!;
      const team = w.getComponent<TeamComponent>('team')!;
      const warrior = w.getComponent<import('../ecs/Component').WarriorComponent>('warrior')!;
      if (health.isDead) continue;
      const mesh = this.meshes.get(w.id);
      result.push({
        id: w.id,
        type: warrior.warriorType,
        team: team.team,
        x: pos.x, y: pos.y, z: pos.z,
        rotY: mesh?.group.rotation.y ?? 0,
        hp: health.current,
        maxHp: health.max,
        state: ai.state,
      });
    }
    return result;
  }

  /** Guest: update warrior meshes from host network data (rendering only). */
  updateFromNetwork(warriors: { id: string; type: string; team: string; x: number; y: number; z: number; rotY: number; hp: number; maxHp: number; state: string }[]): void {
    const receivedIds = new Set<string>();

    for (const w of warriors) {
      receivedIds.add(w.id);
      let mesh = this.meshes.get(w.id);

      // Create mesh if we haven't seen this warrior before
      if (!mesh) {
        const colors = WARRIOR_COLORS[w.type] ?? { player: 0x888888, enemy: 0x888888 };
        const color = w.team === 'player' ? colors.player : colors.enemy;
        this.createMesh(w.id, color, w.type as WarriorType);
        mesh = this.meshes.get(w.id)!;
      }

      // Lerp position for smooth movement
      mesh.group.position.lerp(new THREE.Vector3(w.x, w.y, w.z), 0.2);
      mesh.group.rotation.y = w.rotY;

      // Bobbing animation when marching/chasing
      if (w.state === 'march' || w.state === 'chase') {
        mesh.body.position.y = 0.55 + Math.sin(Date.now() * 0.008) * 0.05;
      }

      // Low-HP tint
      if (w.hp / w.maxHp < 0.3) {
        (mesh.body.material as THREE.MeshStandardMaterial).emissive.setHex(0x330000);
      } else {
        (mesh.body.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      }
    }

    // Remove warriors that no longer exist on the host
    for (const [id, mesh] of this.meshes) {
      if (!receivedIds.has(id)) {
        this.scene.remove(mesh.group);
        mesh.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        this.meshes.delete(id);
        // Also remove from ECS if it was locally tracked
        this.ecsWorld.removeEntity(id);
      }
    }
  }

  /** Guest: remove a specific warrior (on death event from host). */
  removeWarriorFromNetwork(entityId: string): void {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      this.scene.remove(mesh.group);
      mesh.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.meshes.delete(entityId);
    }
    this.ecsWorld.removeEntity(entityId);
  }

  destroy(): void {
    for (const [id] of this.meshes) this.removeWarrior(id);
  }
}
