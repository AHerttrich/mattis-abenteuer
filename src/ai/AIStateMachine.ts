/**
 * AIStateMachine — Controls entity AI behavior transitions.
 */

import { AIState } from '../ecs/Component';
import type { PositionComponent, AIComponent, HealthComponent } from '../ecs/Component';
import { AI_UPDATE_INTERVAL } from '../utils/constants';

export interface AIContext {
  position: PositionComponent;
  ai: AIComponent;
  health: HealthComponent;
  attackRange: number;
  nearestEnemyDist: number | null;
  nearestEnemyId: string | null;
  nearestEnemyPos?: { x: number; z: number };
  isArcher?: boolean;
  targetCastleX?: number;
  targetCastleZ?: number;
}

export class AIStateMachine {
  private timers = new WeakMap<AIComponent, number>();

  /** Update AI state for an entity. Returns the new state. */
  update(dt: number, ctx: AIContext): AIState {
    const timer = (this.timers.get(ctx.ai) ?? 0) + dt;
    if (timer < AI_UPDATE_INTERVAL) {
      this.timers.set(ctx.ai, timer);
      return ctx.ai.state;
    }
    this.timers.set(ctx.ai, 0);

    const { ai } = ctx;
    const enemyDist = ctx.nearestEnemyDist;

    switch (ai.state) {
      case AIState.IDLE:
        if (ctx.targetCastleX !== undefined) return this.transition(ai, AIState.MARCH);
        if (ai.patrolOrigin) return this.transition(ai, AIState.PATROL);
        if (enemyDist !== null && enemyDist < ai.alertRadius) return this.transition(ai, AIState.ALERT);
        return AIState.IDLE;

      case AIState.PATROL:
        if (enemyDist !== null && enemyDist < ai.alertRadius) return this.transition(ai, AIState.ALERT);
        return AIState.PATROL;

      case AIState.ALERT:
        if (enemyDist === null || enemyDist > ai.chaseRadius) return this.transition(ai, AIState.PATROL);
        if (enemyDist < ai.chaseRadius) return this.transition(ai, AIState.CHASE);
        return AIState.ALERT;

      case AIState.CHASE:
        if (enemyDist === null) return this.transition(ai, AIState.PATROL);
        if (enemyDist <= ctx.attackRange) return this.transition(ai, AIState.ATTACK);
        if (enemyDist > ai.chaseRadius) return this.transition(ai, AIState.PATROL);
        return AIState.CHASE;

      case AIState.ATTACK:
        if (ctx.health.current < ctx.health.max * 0.2) return this.transition(ai, AIState.FLEE);
        // Archers kite: retreat if enemy gets too close
        if (ctx.isArcher && enemyDist !== null && enemyDist < 4) return this.transition(ai, AIState.RETREAT);
        if (enemyDist === null || enemyDist > ctx.attackRange) return this.transition(ai, AIState.CHASE);
        return AIState.ATTACK;

      case AIState.MARCH:
        if (enemyDist !== null && enemyDist < ctx.attackRange) return this.transition(ai, AIState.ATTACK);
        if (enemyDist !== null && enemyDist < ai.alertRadius) return this.transition(ai, AIState.CHASE);
        return AIState.MARCH;

      case AIState.FLEE:
        if (ctx.health.current > ctx.health.max * 0.4) return this.transition(ai, AIState.IDLE);
        return AIState.FLEE;

      case AIState.RETREAT:
        // Archers back off then re-engage
        if (enemyDist === null || enemyDist >= 8) return this.transition(ai, AIState.ATTACK);
        return AIState.RETREAT;

      default:
        return AIState.IDLE;
    }
  }

  private transition(ai: AIComponent, newState: AIState): AIState {
    ai.state = newState;
    return newState;
  }

  /** Get movement direction based on AI state and context. */
  getMovementTarget(ctx: AIContext): { x: number; y: number; z: number } | null {
    const { ai, position: pos } = ctx;

    switch (ai.state) {
      case AIState.MARCH:
        if (ctx.targetCastleX !== undefined && ctx.targetCastleZ !== undefined)
          return { x: ctx.targetCastleX, y: pos.y, z: ctx.targetCastleZ };
        return null;

      case AIState.CHASE:
      case AIState.ATTACK:
        if (ctx.nearestEnemyId) return null; // handled by combat system
        return null;

      case AIState.PATROL:
        if (ai.patrolOrigin) {
          // Semi-random wander with noise instead of perfect circle
          const t = Date.now() * 0.0007;
          const noise1 = Math.sin(t * 1.3 + ai.patrolRadius * 7.1) * 0.5;
          const noise2 = Math.cos(t * 0.9 + ai.patrolRadius * 3.3) * 0.5;
          const angle = (t + noise1 + noise2) % (Math.PI * 2);
          const r = ai.patrolRadius * (0.6 + Math.sin(t * 0.4) * 0.4);
          return {
            x: ai.patrolOrigin.x + Math.cos(angle) * r,
            y: ai.patrolOrigin.y,
            z: ai.patrolOrigin.z + Math.sin(angle) * r,
          };
        }
        return null;

      case AIState.FLEE:
      case AIState.RETREAT:
        // Move away from nearest enemy
        if (ctx.nearestEnemyPos) {
          const dx = pos.x - ctx.nearestEnemyPos.x;
          const dz = pos.z - ctx.nearestEnemyPos.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          return { x: pos.x + (dx / len) * 10, y: pos.y, z: pos.z + (dz / len) * 10 };
        }
        return null;

      default:
        return null;
    }
  }
}
