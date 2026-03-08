/**
 * CombatSystem — Handles damage calculation, attacks, and projectiles.
 */

import { eventBus, Events, ATTACK_COOLDOWN, MELEE_RANGE, CATAPULT_RANGE, KNOCKBACK_FORCE, CRIT_CHANCE, CRIT_MULTIPLIER } from '../utils';
import type { ECSWorld, Entity, HealthComponent, CombatComponent, PositionComponent, TeamComponent, WarriorComponent } from '../ecs';
import { WarriorType } from '../ecs/Component';

export class CombatSystem {
  private world: ECSWorld;
  private time = 0;

  constructor(world: ECSWorld) {
    this.world = world;
  }

  update(dt: number): void {
    this.time += dt;
  }

  /** Attempt a melee attack from attacker to target. */
  meleeAttack(attackerId: string, targetId: string): boolean {
    const attacker = this.world.getEntity(attackerId);
    const target = this.world.getEntity(targetId);
    if (!attacker || !target) return false;

    const combat = attacker.getComponent<CombatComponent>('combat');
    const aPos = attacker.getComponent<PositionComponent>('position');
    const tPos = target.getComponent<PositionComponent>('position');
    const tHealth = target.getComponent<HealthComponent>('health');
    if (!combat || !aPos || !tPos || !tHealth) return false;

    // Check cooldown
    if (this.time - combat.lastAttackTime < ATTACK_COOLDOWN) return false;

    // Check range
    const dist = this.distance(aPos, tPos);
    if (dist > (combat.range || MELEE_RANGE)) return false;

    // Check teams
    const aTeam = attacker.getComponent<TeamComponent>('team');
    const tTeam = target.getComponent<TeamComponent>('team');
    if (aTeam && tTeam && aTeam.team === tTeam.team) return false;

    combat.lastAttackTime = this.time;
    let damage = this.calculateDamage(combat.damage, tHealth.armor);

    // Critical hit check
    const isCrit = Math.random() < CRIT_CHANCE;
    if (isCrit) {
      damage = Math.round(damage * CRIT_MULTIPLIER);
      eventBus.emit(Events.CRITICAL_HIT, { attackerId, targetId, damage });
    }

    this.applyDamage(target, tHealth, damage, aPos);

    // Knockback: push target away from attacker
    if (tPos) {
      const dx = tPos.x - aPos.x;
      const dz = tPos.z - aPos.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      tPos.x += (dx / len) * KNOCKBACK_FORCE;
      tPos.z += (dz / len) * KNOCKBACK_FORCE;
    }

    eventBus.emit(Events.ATTACK_HIT, { attackerId, targetId, damage, isCrit });
    return true;
  }

  /** Apply raw damage (bypasses cooldown/range). */
  applyDamage(entity: Entity, health: HealthComponent, rawDamage: number, attackerPos?: PositionComponent | {x: number, z: number}): void {
    let finalDamage = rawDamage;
    const warrior = entity.getComponent<WarriorComponent>('warrior');
    
    // Shield-bearer frontal damage reduction check
    if (warrior?.warriorType === WarriorType.SHIELD_BEARER && attackerPos) {
      const pos = entity.getComponent<PositionComponent>('position');
      if (pos && pos.rotationY !== undefined) {
        const angleToAttacker = Math.atan2(attackerPos.x - pos.x, attackerPos.z - pos.z);
        let diff = (angleToAttacker - pos.rotationY) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        
        // 120-degree cone block
         if (Math.abs(diff) <= Math.PI / 1.5) { 
           finalDamage = Math.max(1, Math.floor(finalDamage * 0.33)); 
           eventBus.emit(Events.SHIELD_BLOCK, { entityId: entity.id, damage: finalDamage });
         }
      }
    }

    health.current = Math.max(0, health.current - finalDamage);
    const pos = entity.getComponent<PositionComponent>('position');
    eventBus.emit(Events.ENTITY_DAMAGED, { entityId: entity.id, damage: finalDamage, remaining: health.current, pos });
    if (health.current <= 0) {
      health.isDead = true;
      eventBus.emit(Events.ENTITY_DIED, { entityId: entity.id, tag: entity.tag, pos });
    }
  }

  /** Damage formula: max(1, damage - armor * 0.5) */
  calculateDamage(baseDamage: number, armor: number): number {
    return Math.max(1, Math.round(baseDamage - armor * 0.5));
  }

  /** Find nearest enemy entity within range. */
  findNearestEnemy(entity: Entity, maxRange: number): Entity | null {
    const pos = entity.getComponent<PositionComponent>('position');
    const team = entity.getComponent<TeamComponent>('team');
    if (!pos || !team) return null;

    let nearest: Entity | null = null;
    let nearestDist = maxRange;

    const entities = this.world.query('position', 'health', 'team');
    for (const other of entities) {
      if (other.id === entity.id) continue;
      const oTeam = other.getComponent<TeamComponent>('team')!;
      if (oTeam.team === team.team || oTeam.team === 'neutral') continue;
      const oHealth = other.getComponent<HealthComponent>('health')!;
      if (oHealth.isDead) continue;
      const oPos = other.getComponent<PositionComponent>('position')!;
      const dist = this.distance(pos, oPos);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  /** Catapult attack — ranged AOE damage to castle blocks. */
  catapultAttack(pos: PositionComponent, targetPos: PositionComponent, damage: number): boolean {
    const dist = this.distance(pos, targetPos);
    if (dist > CATAPULT_RANGE) return false;
    eventBus.emit(Events.PROJECTILE_LAUNCHED, { from: pos, to: targetPos, damage });
    return true;
  }

  private distance(a: PositionComponent, b: PositionComponent): number {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
