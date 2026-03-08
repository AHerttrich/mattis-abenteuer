import { describe, it, expect, beforeEach } from 'vitest';
import { PathFinder } from '../ai/PathFinder';
import { AIStateMachine } from '../ai/AIStateMachine';
import { AIState, createPosition, createHealth, createAI } from '../ecs';
import type { AIContext } from '../ai/AIStateMachine';

describe('AI', () => {
  describe('PathFinder', () => {
    it('should find a straight-line path', () => {
      // Flat ground: solid at y=-1, air at y=0+
      const isSolid = (_x: number, y: number, _z: number): boolean => y < 0;
      const pf = new PathFinder(isSolid);
      const path = pf.findPath(0, 0, 0, 3, 0, 0);
      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
      expect(path![path!.length - 1]).toEqual({ x: 3, y: 0, z: 0 });
    });

    it('should return null for unreachable goals', () => {
      // Wall blocks all paths
      const isSolid = (x: number, y: number, _z: number): boolean => y < 0 || x === 2;
      const pf = new PathFinder(isSolid);
      const path = pf.findPath(0, 0, 0, 5, 0, 0);
      expect(path).toBeNull();
    });
  });

  describe('AIStateMachine', () => {
    let sm: AIStateMachine;
    beforeEach(() => { sm = new AIStateMachine(); });

    function makeContext(overrides: Partial<AIContext> = {}): AIContext {
      return {
        position: createPosition(0, 0, 0),
        ai: createAI(10, 15, 25),
        health: createHealth(100),
        attackRange: 2.5,
        nearestEnemyDist: null,
        nearestEnemyId: null,
        ...overrides,
      };
    }

    it('should start in IDLE state', () => {
      const ctx = makeContext();
      expect(ctx.ai.state).toBe(AIState.IDLE);
    });

    it('should transition to ALERT when enemy detected', () => {
      const ctx = makeContext({ nearestEnemyDist: 10, nearestEnemyId: 'e1' });
      // Need to advance past update interval
      sm.update(1.0, ctx);
      expect(ctx.ai.state).toBe(AIState.ALERT);
    });

    it('should transition to MARCH when target castle set', () => {
      const ctx = makeContext({ targetCastleX: 500, targetCastleZ: 500 });
      sm.update(1.0, ctx);
      expect(ctx.ai.state).toBe(AIState.MARCH);
    });
  });
});
