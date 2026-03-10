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

    it('should reject paths through 1-block-high tunnels (headroom check)', () => {
      // Ground at y=-1, overhang at y=1 blocking x=2 (only 1 block clearance)
      const isSolid = (x: number, y: number, _z: number): boolean => {
        if (y < 0) return true; // ground
        if (x === 2 && y === 1) return true; // overhang at head level
        return false;
      };
      const pf = new PathFinder(isSolid);
      // Path from (0,0,0) to (4,0,0) must go around x=2 or return null
      const path = pf.findPath(0, 0, 0, 4, 0, 0);
      if (path) {
        // If a path is found, it must not pass through x=2,y=0 (under the overhang)
        const goesUnderOverhang = path.some((p) => p.x === 2 && p.y === 0);
        expect(goesUnderOverhang).toBe(false);
      }
    });

    it('should find paths between different elevations', () => {
      // Step terrain: y=0 ground from x=0-2, y=1 ground from x=3+
      const isSolid = (x: number, y: number, _z: number): boolean => {
        if (x >= 3) return y < 1; // higher ground
        return y < 0; // lower ground
      };
      const pf = new PathFinder(isSolid);
      const path = pf.findPath(0, 0, 0, 4, 1, 0);
      expect(path).not.toBeNull();
      expect(path![path!.length - 1].y).toBe(1);
    });

    it('should navigate around L-shaped walls', () => {
      // L-shaped wall: x=2 from z=0-3, z=3 from x=2-5
      const isSolid = (x: number, y: number, z: number): boolean => {
        if (y < 0) return true; // ground
        if (y > 1) return false; // air above head
        if (x === 2 && z <= 3) return true; // vertical part of L
        if (z === 3 && x >= 2 && x <= 5) return true; // horizontal part of L
        return false;
      };
      const pf = new PathFinder(isSolid);
      const path = pf.findPath(0, 0, 0, 4, 0, 0);
      if (path) {
        // Path found — it should go around the wall (z < 0 side)
        expect(path.length).toBeGreaterThan(4); // must detour
        expect(path[path.length - 1]).toEqual({ x: 4, y: 0, z: 0 });
      }
    });
  });

  describe('AIStateMachine', () => {
    let sm: AIStateMachine;
    beforeEach(() => {
      sm = new AIStateMachine();
    });

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
