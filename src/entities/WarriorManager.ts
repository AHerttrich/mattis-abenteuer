/**
 * WarriorManager — Spawns, renders, moves, and controls warrior entities.
 * Warriors are 3D box-shaped entities that march between castles and fight.
 */

import * as THREE from 'three';
import {
  ECSWorld,
  Entity,
  createPosition,
  createVelocity,
  createHealth,
  createCombat,
  createTeam,
  createAI,
  createWarrior,
} from '../ecs';
import { AIState, WarriorType } from '../ecs/Component';
import type {
  PositionComponent,
  HealthComponent,
  AIComponent,
  TeamComponent,
} from '../ecs/Component';
import { CombatSystem } from '../combat/CombatSystem';
import {
  eventBus,
  Events,
  GUARD_PATROL_RADIUS,
  GUARD_ALERT_RADIUS,
  GUARD_CHASE_RADIUS,
} from '../utils';
import { AIStateMachine } from '../ai/AIStateMachine';
import type { AIContext } from '../ai/AIStateMachine';
import { PathFinder } from '../ai/PathFinder';
import type { ChunkManager } from '../world/ChunkManager';
import { isBlockSolid } from '../world/BlockType';
import { soundManager } from '../engine/SoundManager';

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
function createHealthBarSprite(): {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
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

const WARRIOR_STATS: Record<string, { hp: number; damage: number; speed: number; range: number }> =
  {
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
  private paths = new Map<
    string,
    { waypoints: { x: number; y: number; z: number }[]; index: number; repathTimer: number }
  >();
  private lastPositions = new Map<string, { x: number; z: number; stuckTimer: number }>();
  private formationSlotCounter = new Map<string, number>(); // team → next slot index
  private lastSoundTime = new Map<string, number>(); // entityId → last sound time

  constructor(
    ecsWorld: ECSWorld,
    scene: THREE.Scene,
    combat: CombatSystem,
    chunkManager: ChunkManager,
  ) {
    this.ecsWorld = ecsWorld;
    this.scene = scene;
    this.combat = combat;
    this.chunkManager = chunkManager;
    this.pathFinder = new PathFinder((x, y, z) => {
      const block = chunkManager.getBlockAtWorld(x, y, z);
      return block !== undefined && isBlockSolid(block);
    });

    eventBus.on(Events.ENTITY_DIED, (data: unknown) => {
      const { entityId, pos } = data as { entityId: string; pos?: PositionComponent };
      // Try to find the last attacker's approximate position from the entity's facing direction
      this.removeWarrior(entityId, pos);
    });
  }

  setEnemyCastlePos(x: number, z: number): void {
    this.enemyCastlePos = { x, z };
  }
  setPlayerCastlePos(x: number, z: number): void {
    this.playerCastlePos = { x, z };
  }

  /** Spawn a warrior entity with 3D mesh. */
  spawnWarrior(
    type: WarriorType,
    team: 'player' | 'enemy',
    x: number,
    y: number,
    z: number,
    sourceCastleId: string,
    targetCastleId: string,
  ): Entity {
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
      .addComponent(
        createWarrior(type, sourceCastleId, targetCastleId, this.nextFormationSlot(team)),
      );

    // Set AI initial state
    const ai = entity.getComponent<AIComponent>('ai')!;
    if (team === 'player') {
      ai.state = AIState.MARCH;
    } else {
      ai.state = AIState.PATROL;
      ai.patrolOrigin = { x: sx, y, z: sz };
    }

    this.ecsWorld.addEntity(entity);
    this.createMesh(entity.id, color, type, team);
    return entity;
  }

  private createMesh(
    entityId: string,
    color: number,
    type: WarriorType,
    team: 'player' | 'enemy',
  ): void {
    const group = new THREE.Group();

    // Body dimensions vary by type
    const bodyW =
      type === WarriorType.SHIELD_BEARER ? 0.6 : type === WarriorType.ARCHER ? 0.4 : 0.5;
    const bodyH =
      type === WarriorType.CAVALRY ? 1.2 : type === WarriorType.CATAPULT_OPERATOR ? 0.7 : 0.9;
    const bodyD = type === WarriorType.SHIELD_BEARER ? 0.5 : 0.4;
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyD);
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

    // Eye dots (two small white cubes on front of head)
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, bodyH + 0.32, 0.18);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, bodyH + 0.32, 0.18);
    group.add(rightEye);

    // Shoulder plates (team-colored)
    const shoulderGeo = new THREE.BoxGeometry(0.22, 0.08, 0.28);
    const shoulderMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.35, bodyH - 0.05, 0);
    group.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    rightShoulder.position.set(0.35, bodyH - 0.05, 0);
    group.add(rightShoulder);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.7, 0.2);
    const armMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, bodyH / 2 + 0.2, 0);
    leftArm.geometry.translate(0, -0.35, 0);
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

    // ── Team Pennant Flag ──────────────────────────────────
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, bodyH + 0.9, -0.2);
    group.add(pole);

    const flagGeo = new THREE.PlaneGeometry(0.35, 0.25);
    const flagColor = team === 'player' ? 0x2040c0 : 0xc02020;
    const flagMat = new THREE.MeshStandardMaterial({
      color: flagColor,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(flagColor),
      emissiveIntensity: 0.15,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.18, bodyH + 1.3, -0.2);
    group.add(flag);

    // Crest dot on flag (player = white circle-ish, enemy = dark cross)
    const crestGeo = new THREE.BoxGeometry(0.08, 0.08, 0.01);
    const crestMat = new THREE.MeshStandardMaterial({
      color: team === 'player' ? 0xffffff : 0x000000,
      emissive: team === 'player' ? new THREE.Color(0x4488ff) : new THREE.Color(0xff2222),
      emissiveIntensity: 0.4,
    });
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.set(0.18, bodyH + 1.3, -0.19);
    group.add(crest);

    // ── Type-specific gear ─────────────────────────────────
    if (type === WarriorType.SWORDSMAN || type === WarriorType.CAVALRY) {
      const swordGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
      const swordMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 });
      const sword = new THREE.Mesh(swordGeo, swordMat);
      sword.position.set(0.35, 0.7, 0);
      sword.rotation.z = 0.3;
      group.add(sword);
    }

    if (type === WarriorType.ARCHER) {
      // Bow
      const bowGeo = new THREE.BoxGeometry(0.05, 0.5, 0.05);
      const bowMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const bow = new THREE.Mesh(bowGeo, bowMat);
      bow.position.set(0.3, 0.7, 0);
      group.add(bow);
      // Quiver on back
      const quiverGeo = new THREE.BoxGeometry(0.12, 0.4, 0.08);
      const quiverMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
      const quiver = new THREE.Mesh(quiverGeo, quiverMat);
      quiver.position.set(0.08, bodyH * 0.6, -0.25);
      quiver.rotation.z = 0.15;
      group.add(quiver);
      // Arrow tips poking out
      const arrowGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
      for (let i = 0; i < 3; i++) {
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.set(0.05 + i * 0.03, bodyH * 0.6 + 0.25, -0.25);
        group.add(arrow);
      }
    }

    if (type === WarriorType.SHIELD_BEARER) {
      const swordGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
      const swordMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 });
      const sword = new THREE.Mesh(swordGeo, swordMat);
      sword.position.set(0.4, 0.7, 0);
      sword.rotation.z = 0.3;
      group.add(sword);
      // Large shield with team color stripe
      const shieldGeo = new THREE.BoxGeometry(0.1, 0.9, 0.7);
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.3 });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(-0.05, 0.6, 0.35);
      group.add(shield);
      // Team stripe on shield
      const stripeGeo = new THREE.BoxGeometry(0.11, 0.8, 0.15);
      const stripeMat = new THREE.MeshStandardMaterial({ color: flagColor, metalness: 0.2 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(-0.05, 0.6, 0.38);
      group.add(stripe);
    }

    if (type === WarriorType.CAVALRY) {
      // Horse body underneath rider
      const horseGeo = new THREE.BoxGeometry(0.5, 0.6, 1.0);
      const horseMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
      const horse = new THREE.Mesh(horseGeo, horseMat);
      horse.position.set(0, 0.3, 0.1);
      group.add(horse);
      // Horse head
      const hHeadGeo = new THREE.BoxGeometry(0.3, 0.25, 0.3);
      const hHead = new THREE.Mesh(hHeadGeo, horseMat);
      hHead.position.set(0, 0.5, 0.65);
      group.add(hHead);
      // Horse legs
      const hLegGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
      for (const [lx, lz] of [
        [-0.2, -0.35],
        [0.2, -0.35],
        [-0.2, 0.35],
        [0.2, 0.35],
      ]) {
        const hLeg = new THREE.Mesh(hLegGeo, horseMat);
        hLeg.position.set(lx, 0, lz + 0.1);
        group.add(hLeg);
      }
    }

    if (type === WarriorType.CATAPULT_OPERATOR) {
      // Cart base
      const cartGeo = new THREE.BoxGeometry(0.8, 0.2, 1.0);
      const cartMat = new THREE.MeshStandardMaterial({ color: 0x5a4430 });
      const cart = new THREE.Mesh(cartGeo, cartMat);
      cart.position.set(0, 0.1, 0.2);
      group.add(cart);
      // Catapult arm
      const armBeam = new THREE.BoxGeometry(0.08, 0.08, 0.8);
      const beamMat = new THREE.MeshStandardMaterial({ color: 0x3b2f1e });
      const beam = new THREE.Mesh(armBeam, beamMat);
      beam.position.set(0, 0.5, 0.3);
      beam.rotation.x = -0.4;
      group.add(beam);
    }

    if (type === WarriorType.CASTLE_BOSS) {
      group.scale.set(1.8, 1.8, 1.8);
      // Crown on head
      const crownGeo = new THREE.BoxGeometry(0.4, 0.12, 0.4);
      const crownMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: new THREE.Color(0xffd700),
        emissiveIntensity: 0.5,
        metalness: 0.8,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, bodyH + 0.55, 0);
      group.add(crown);
      // Crown spikes
      const spikeGeo = new THREE.BoxGeometry(0.06, 0.12, 0.06);
      for (let i = -1; i <= 1; i++) {
        const spike = new THREE.Mesh(spikeGeo, crownMat);
        spike.position.set(i * 0.12, bodyH + 0.65, 0);
        group.add(spike);
      }
      // Emissive glow body
      bodyMat.emissive = new THREE.Color(color);
      bodyMat.emissiveIntensity = 0.3;
      // Giant hammer/mace
      const maceGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
      const maceMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const mace = new THREE.Mesh(maceGeo, maceMat);
      mace.position.set(0.6, 0.8, 0);
      mace.rotation.z = Math.PI / 4;
      const mHeadGeo = new THREE.DodecahedronGeometry(0.3);
      const mHeadMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const maceHead = new THREE.Mesh(mHeadGeo, mHeadMat);
      maceHead.position.set(0, 0.6, 0);
      mace.add(maceHead);
      group.add(mace);
    }

    this.scene.add(group);
    const hpBar = createHealthBarSprite();
    hpBar.sprite.position.y = type === WarriorType.CASTLE_BOSS ? 3.5 : 1.7;
    group.add(hpBar.sprite);
    this.meshes.set(entityId, {
      group,
      body,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      healthBar: hpBar.sprite,
      healthBarCanvas: hpBar.canvas,
      healthBarCtx: hpBar.ctx,
    });
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
      const enemyDist = nearestEnemy
        ? this.dist(pos, nearestEnemy.getComponent<PositionComponent>('position')!)
        : null;

      // Target castle position
      const targetCastle = team.team === 'player' ? this.enemyCastlePos : this.playerCastlePos;

      // Home castle position for retreat
      const homeCastle = team.team === 'player' ? this.playerCastlePos : this.enemyCastlePos;

      // AI update
      const combatComp =
        warrior.getComponent<import('../ecs/Component').CombatComponent>('combat')!;
      const wComp = warrior.getComponent<import('../ecs/Component').WarriorComponent>('warrior')!;
      const nearestEnemyPos = nearestEnemy
        ? {
            x: nearestEnemy.getComponent<PositionComponent>('position')!.x,
            z: nearestEnemy.getComponent<PositionComponent>('position')!.z,
          }
        : undefined;
      const ctx: AIContext = {
        position: pos,
        ai,
        health,
        attackRange: combatComp.range,
        nearestEnemyDist: enemyDist,
        nearestEnemyId: nearestEnemy?.id ?? null,
        nearestEnemyPos,
        isArcher: wComp.warriorType === WarriorType.ARCHER,
        warriorType: wComp.warriorType,
        targetCastleX: targetCastle?.x,
        targetCastleZ: targetCastle?.z,
        homeCastleX: homeCastle?.x,
        homeCastleZ: homeCastle?.z,
      };

      const prevState = ai.state;
      this.aiSM.update(dt, ctx);

      // ── Battle sound effects (throttled to 1 per 2s per warrior) ──
      const now = Date.now() / 1000;
      const lastSound = this.lastSoundTime.get(warrior.id) ?? 0;
      if (now - lastSound > 2) {
        // State transition sounds
        if (
          ai.state === AIState.CHASE &&
          (prevState === AIState.IDLE ||
            prevState === AIState.PATROL ||
            prevState === AIState.MARCH ||
            prevState === AIState.ALERT)
        ) {
          soundManager.playWarCry();
          this.lastSoundTime.set(warrior.id, now);
        } else if (ai.state === AIState.FLEE && prevState !== AIState.FLEE) {
          soundManager.playPanic();
          this.lastSoundTime.set(warrior.id, now);
        } else if (ai.state === AIState.MARCH && wComp.warriorType === WarriorType.CAVALRY) {
          soundManager.playCavalryCharge();
          this.lastSoundTime.set(warrior.id, now);
        }
      }

      // Movement based on AI state
      const speed = WARRIOR_STATS[wComp.warriorType]?.speed ?? 3;

      if (ai.state === AIState.MARCH && targetCastle) {
        const fOffset = this.getFormationOffset(wComp, pos, targetCastle);
        this.moveToward(
          pos,
          warrior.id,
          targetCastle.x + fOffset.x,
          targetCastle.z + fOffset.z,
          speed,
          dt,
        );
      } else if (ai.state === AIState.CHASE && nearestEnemy) {
        const ePos = nearestEnemy.getComponent<PositionComponent>('position')!;
        this.moveToward(pos, warrior.id, ePos.x, ePos.z, speed, dt);
      } else if (ai.state === AIState.ATTACK && nearestEnemy) {
        if (wComp.warriorType === WarriorType.ARCHER) {
          const combatState =
            warrior.getComponent<import('../ecs/Component').CombatComponent>('combat')!;
          if (Date.now() / 1000 - combatState.lastAttackTime >= 1.5) {
            // 1.5s cooldown
            combatState.lastAttackTime = Date.now() / 1000;
            const ePos = nearestEnemy.getComponent<PositionComponent>('position')!;
            eventBus.emit(Events.ARROW_FIRED, {
              from: { x: pos.x, y: pos.y + 0.5, z: pos.z },
              to: { x: ePos.x, y: ePos.y + 1, z: ePos.z },
              damage: combatState.damage,
              team: team.team,
            });
            // Face target fully
            const angle = Math.atan2(ePos.x - pos.x, ePos.z - pos.z);
            const mesh = this.meshes.get(warrior.id);
            if (mesh) mesh.group.rotation.y = angle;
          }
        } else {
          if (this.combat.meleeAttack(warrior.id, nearestEnemy.id)) {
            soundManager.playSwordSwing();
          }
        }
      } else if (ai.state === AIState.PATROL && ai.patrolOrigin) {
        const angle = (Date.now() * 0.0003) % (Math.PI * 2);
        const tx = ai.patrolOrigin.x + Math.cos(angle) * ai.patrolRadius * 0.5;
        const tz = ai.patrolOrigin.z + Math.sin(angle) * ai.patrolRadius * 0.5;
        this.moveToward(pos, warrior.id, tx, tz, speed * 0.3, dt);
      } else if (ai.state === AIState.FLEE) {
        // Retreat toward home castle
        if (homeCastle) {
          this.moveToward(pos, warrior.id, homeCastle.x, homeCastle.z, speed * 1.2, dt);
          // Heal 1 HP/s when within 10 blocks of home castle
          const distToHome = Math.sqrt((pos.x - homeCastle.x) ** 2 + (pos.z - homeCastle.z) ** 2);
          if (distToHome < 10 && health.current < health.max) {
            health.current = Math.min(health.max, health.current + dt);
          }
        } else if (nearestEnemy) {
          // Fallback: run away
          const ePos = nearestEnemy.getComponent<PositionComponent>('position')!;
          const dx = pos.x - ePos.x,
            dz = pos.z - ePos.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          this.moveToward(
            pos,
            warrior.id,
            pos.x + (dx / len) * 10,
            pos.z + (dz / len) * 10,
            speed * 1.2,
            dt,
          );
        }
      } else if (ai.state === AIState.RETREAT && nearestEnemy) {
        // Kite: move away from nearest enemy (archers/catapults maintaining range)
        const ePos = nearestEnemy.getComponent<PositionComponent>('position')!;
        const dx = pos.x - ePos.x;
        const dz = pos.z - ePos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        this.moveToward(
          pos,
          warrior.id,
          pos.x + (dx / len) * 10,
          pos.z + (dz / len) * 10,
          speed * 1.2,
          dt,
        );
      }

      // Apply separation force (flocking) — push away from nearby same-team warriors
      this.applySeparation(pos, warrior.id, team.team, dt);

      // Apply gravity to snap to terrain
      this.applyGravity(pos);

      // Update mesh
      const mesh = this.meshes.get(warrior.id);
      if (mesh) {
        mesh.group.position.set(pos.x, pos.y, pos.z);

        // Walk animation when moving
        if (
          ai.state === AIState.MARCH ||
          ai.state === AIState.CHASE ||
          ai.state === AIState.FLEE ||
          ai.state === AIState.RETREAT
        ) {
          const walkCycle = Date.now() * 0.008;
          mesh.body.position.y = 0.55 + Math.sin(walkCycle) * 0.05;
          mesh.leftArm.rotation.x = Math.sin(walkCycle) * 0.6;
          mesh.rightArm.rotation.x = -Math.sin(walkCycle) * 0.6;
          mesh.leftLeg.rotation.x = -Math.sin(walkCycle) * 0.5;
          mesh.rightLeg.rotation.x = Math.sin(walkCycle) * 0.5;
        } else if (ai.state === AIState.ATTACK) {
          // Per-type attack animations
          const t = Date.now();
          switch (wComp.warriorType) {
            case WarriorType.SWORDSMAN: {
              // Overhead slash: right arm sweeps -1.2 to 0.8
              const cyc = (t * 0.012) % (Math.PI * 2);
              mesh.rightArm.rotation.x = Math.sin(cyc) * 1.2;
              mesh.leftArm.rotation.x = 0;
              mesh.body.rotation.x = Math.sin(cyc) * 0.1; // lean forward
              mesh.leftLeg.rotation.x = 0;
              mesh.rightLeg.rotation.x = 0;
              break;
            }
            case WarriorType.ARCHER: {
              // Draw bow: left arm forward, right arm pull back, hold at peak
              const cyc = (t * 0.006) % (Math.PI * 2);
              const pull = Math.max(0, Math.sin(cyc)); // 0..1 pull
              mesh.leftArm.rotation.x = -0.8; // holding bow forward
              mesh.rightArm.rotation.x = -0.8 + pull * 1.2; // pull back
              mesh.body.rotation.x = -0.05; // slight lean back
              mesh.leftLeg.rotation.x = 0;
              mesh.rightLeg.rotation.x = 0;
              break;
            }
            case WarriorType.CAVALRY: {
              // Lance thrust: both arms forward, body lunge
              const cyc = (t * 0.01) % (Math.PI * 2);
              mesh.rightArm.rotation.x = -0.8 + Math.sin(cyc) * 0.5;
              mesh.leftArm.rotation.x = -0.8 + Math.sin(cyc) * 0.5;
              mesh.body.rotation.x = Math.sin(cyc) * 0.15; // body lunge
              mesh.leftLeg.rotation.x = -Math.sin(cyc) * 0.3;
              mesh.rightLeg.rotation.x = Math.sin(cyc) * 0.3;
              break;
            }
            case WarriorType.SHIELD_BEARER: {
              // Shield bash + sword slash
              const cyc = (t * 0.01) % (Math.PI * 2);
              mesh.leftArm.rotation.x = Math.sin(cyc) * 0.8; // shield push
              mesh.rightArm.rotation.x = Math.sin(cyc + Math.PI * 0.5) * 1.0; // offset slash
              mesh.body.rotation.x = Math.sin(cyc) * 0.1;
              mesh.leftLeg.rotation.x = 0;
              mesh.rightLeg.rotation.x = 0;
              break;
            }
            case WarriorType.CATAPULT_OPERATOR: {
              // Slow windup: right arm circular sweep
              const cyc = (t * 0.004) % (Math.PI * 2);
              mesh.rightArm.rotation.x = Math.sin(cyc) * 1.5;
              mesh.rightArm.rotation.z = Math.cos(cyc) * 0.3;
              mesh.leftArm.rotation.x = 0;
              mesh.body.rotation.x = 0;
              mesh.leftLeg.rotation.x = 0;
              mesh.rightLeg.rotation.x = 0;
              break;
            }
            case WarriorType.CASTLE_BOSS: {
              // Ground pound: both arms up then slam, body bounce
              const cyc = (t * 0.008) % (Math.PI * 2);
              const slam = Math.sin(cyc);
              mesh.rightArm.rotation.x = slam * -1.5;
              mesh.leftArm.rotation.x = slam * -1.5;
              mesh.body.position.y = 0.55 + Math.abs(slam) * 0.1;
              mesh.body.rotation.x = slam * 0.15;
              mesh.leftLeg.rotation.x = -slam * 0.2;
              mesh.rightLeg.rotation.x = slam * 0.2;
              break;
            }
          }
        } else if (ai.state === AIState.PATROL) {
          // Slight idle sway
          const breathe = Math.sin(Date.now() * 0.002) * 0.03;
          mesh.leftArm.rotation.x = breathe;
          mesh.rightArm.rotation.x = -breathe;
          mesh.body.rotation.x = 0;
          mesh.leftLeg.rotation.x = 0;
          mesh.rightLeg.rotation.x = 0;
        } else {
          // Idle: reset limbs
          mesh.leftArm.rotation.x = 0;
          mesh.rightArm.rotation.x = 0;
          mesh.body.rotation.x = 0;
          mesh.leftLeg.rotation.x = 0;
          mesh.rightLeg.rotation.x = 0;
        }

        // Face movement direction
        if (ai.state !== AIState.IDLE) {
          const target =
            ai.state === AIState.MARCH && targetCastle
              ? targetCastle
              : nearestEnemy
                ? {
                    x: nearestEnemy.getComponent<PositionComponent>('position')!.x,
                    z: nearestEnemy.getComponent<PositionComponent>('position')!.z,
                  }
                : null;
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
        const barColor =
          hpRatio > 0.5
            ? `rgb(${Math.round(255 * (1 - hpRatio) * 2)},${Math.round(200 + 55 * hpRatio)},60)`
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
        const dx = ePos.x - bld.x,
          dz = ePos.z - bld.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < closestDist) {
          closestDist = d;
          closest = { x: ePos.x, y: ePos.y + 1, z: ePos.z };
        }
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
    const bx = Math.floor(x),
      bz = Math.floor(z);
    // Scan down from a generous height
    for (let y = 60; y > 0; y--) {
      if (this.isSolidAt(bx, y, bz) && !this.isSolidAt(bx, y + 1, bz)) {
        return y + 1;
      }
    }
    return 0;
  }

  private moveToward(
    pos: PositionComponent,
    entityId: string,
    tx: number,
    tz: number,
    speed: number,
    dt: number,
  ): void {
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
        Math.floor(pos.x),
        Math.floor(pos.y),
        Math.floor(pos.z),
        Math.floor(tx),
        goalY,
        Math.floor(tz),
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

      const dx = wp.x + 0.5 - pos.x;
      const dz = wp.z + 0.5 - pos.z;
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
        if (
          !this.isSolidAt(Math.floor(nextX), by, Math.floor(nextZ)) &&
          !this.isSolidAt(Math.floor(nextX), by + 1, Math.floor(nextZ))
        ) {
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
    if (
      !this.isSolidAt(Math.floor(nx), feetY, Math.floor(pos.z)) &&
      !this.isSolidAt(Math.floor(nx), headY, Math.floor(pos.z))
    ) {
      pos.x = nx;
    }
    // Move Z axis if not blocked
    if (
      !this.isSolidAt(Math.floor(pos.x), feetY, Math.floor(nz)) &&
      !this.isSolidAt(Math.floor(pos.x), headY, Math.floor(nz))
    ) {
      pos.z = nz;
    }
  }

  /** Apply gravity — snap warrior to terrain surface each frame */
  private applyGravity(pos: PositionComponent): void {
    const bx = Math.floor(pos.x),
      bz = Math.floor(pos.z);
    // Find ground: check downward from current pos
    let gy = Math.floor(pos.y);
    // If inside solid, push up
    while (gy < pos.y + 5 && this.isSolidAt(bx, gy, bz)) gy++;
    // If floating, push down
    while (gy > 0 && !this.isSolidAt(bx, gy - 1, bz)) gy--;
    // Smooth snap
    pos.y += (gy - pos.y) * 0.25;
  }

  /** Get next formation slot index for a team. */
  private nextFormationSlot(team: string): number {
    const current = this.formationSlotCounter.get(team) ?? 0;
    this.formationSlotCounter.set(team, current + 1);
    return current;
  }

  /** Calculate formation offset for march movement. */
  private getFormationOffset(
    wComp: import('../ecs/Component').WarriorComponent,
    pos: PositionComponent,
    target: { x: number; z: number },
  ): { x: number; z: number } {
    // Direction from warrior to target
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    // perpendicular vector (right)
    const px = -dz / len;
    const pz = dx / len;
    // forward vector
    const fx = dx / len;
    const fz = dz / len;

    // Lateral offset from formation slot (±1.5 blocks, alternating sides)
    const slot = wComp.formationSlot;
    const lateral = (slot % 2 === 0 ? 1 : -1) * Math.ceil(slot / 2) * 1.5;

    // Depth offset based on warrior type (relative to march direction)
    let depth = 0;
    switch (wComp.warriorType) {
      case WarriorType.SHIELD_BEARER:
        depth = 3;
        break; // front row
      case WarriorType.SWORDSMAN:
        depth = 0;
        break; // middle
      case WarriorType.ARCHER:
        depth = -4;
        break; // back row
      case WarriorType.CAVALRY:
        depth = 1;
        break; // slightly forward, flanks handled by wider lateral
      case WarriorType.CATAPULT_OPERATOR:
        depth = -6;
        break; // far back
      case WarriorType.CASTLE_BOSS:
        depth = 2;
        break; // front-ish
    }

    return {
      x: px * lateral + fx * depth,
      z: pz * lateral + fz * depth,
    };
  }

  /** Apply boid-style separation force — push apart nearby same-team warriors. */
  private applySeparation(
    pos: PositionComponent,
    entityId: string,
    team: string,
    dt: number,
  ): void {
    const SEPARATION_RADIUS = 1.5;
    const SEPARATION_FORCE = 2.0;
    let pushX = 0,
      pushZ = 0;

    const warriors = this.ecsWorld.query('position', 'health', 'team');
    for (const other of warriors) {
      if (other.id === entityId) continue;
      const oTeam = other.getComponent<TeamComponent>('team')!;
      if (oTeam.team !== team) continue;
      const oHealth = other.getComponent<HealthComponent>('health')!;
      if (oHealth.isDead) continue;
      const oPos = other.getComponent<PositionComponent>('position')!;

      const dx = pos.x - oPos.x;
      const dz = pos.z - oPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < SEPARATION_RADIUS && dist > 0.01) {
        const strength = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS;
        pushX += (dx / dist) * strength;
        pushZ += (dz / dist) * strength;
      }
    }

    const pushLen = Math.sqrt(pushX * pushX + pushZ * pushZ);
    if (pushLen > 0.01) {
      const cap = SEPARATION_FORCE * dt;
      const scale = Math.min(cap, pushLen) / pushLen;
      pos.x += pushX * scale;
      pos.z += pushZ * scale;
    }
  }

  private isSolidAt(x: number, y: number, z: number): boolean {
    const block = this.chunkManager.getBlockAtWorld(x, y, z);
    return block !== undefined && isBlockSolid(block);
  }

  removeWarrior(entityId: string, killerPos?: { x: number; z: number }): void {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      // Death animation: knockback + tumble + fade over 0.6s
      const startTime = Date.now();
      const duration = 600; // ms

      // Calculate knockback direction (away from killer)
      let kbX = 0,
        kbZ = 0;
      if (killerPos) {
        const dx = mesh.group.position.x - killerPos.x;
        const dz = mesh.group.position.z - killerPos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        kbX = (dx / len) * 3; // 3 blocks knockback
        kbZ = (dz / len) * 3;
      } else {
        // Random direction if no killer info
        const angle = Math.random() * Math.PI * 2;
        kbX = Math.cos(angle) * 2;
        kbZ = Math.sin(angle) * 2;
      }

      // Random tumble spin axes
      const spinX = (Math.random() - 0.5) * 12;
      const spinZ = (Math.random() - 0.5) * 12;
      const startY = mesh.group.position.y;
      const startX = mesh.group.position.x;
      const startZ = mesh.group.position.z;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);

        // Parabolic arc: fly up then down
        const arcY = startY + Math.sin(t * Math.PI) * 1.5 - t * 0.5;
        mesh.group.position.x = startX + kbX * t;
        mesh.group.position.y = arcY;
        mesh.group.position.z = startZ + kbZ * t;

        // Tumble rotation
        mesh.group.rotation.x = spinX * t;
        mesh.group.rotation.z = spinZ * t;

        // Shrink + fade
        const scale = Math.max(0, 1 - t * t);
        mesh.group.scale.setScalar(scale);
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
    const dx = a.x - b.x,
      dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  get warriorCount(): number {
    return this.meshes.size;
  }

  // ── Network sync (co-op multiplayer) ─────────────────────────

  /** Host: serialize all warrior positions/health for network broadcast. */
  getAllWarriorState(): {
    id: string;
    type: string;
    team: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    hp: number;
    maxHp: number;
    state: string;
  }[] {
    const warriors = this.ecsWorld.query('position', 'health', 'ai', 'warrior', 'team');
    const result: {
      id: string;
      type: string;
      team: string;
      x: number;
      y: number;
      z: number;
      rotY: number;
      hp: number;
      maxHp: number;
      state: string;
    }[] = [];
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
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rotY: mesh?.group.rotation.y ?? 0,
        hp: health.current,
        maxHp: health.max,
        state: ai.state,
      });
    }
    return result;
  }

  /** Guest: update warrior meshes from host network data (rendering only). */
  updateFromNetwork(
    warriors: {
      id: string;
      type: string;
      team: string;
      x: number;
      y: number;
      z: number;
      rotY: number;
      hp: number;
      maxHp: number;
      state: string;
    }[],
  ): void {
    const receivedIds = new Set<string>();

    for (const w of warriors) {
      receivedIds.add(w.id);
      let mesh = this.meshes.get(w.id);

      // Create mesh if we haven't seen this warrior before
      if (!mesh) {
        const colors = WARRIOR_COLORS[w.type] ?? { player: 0x888888, enemy: 0x888888 };
        const color = w.team === 'player' ? colors.player : colors.enemy;
        this.createMesh(w.id, color, w.type as WarriorType, w.team as 'player' | 'enemy');
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
