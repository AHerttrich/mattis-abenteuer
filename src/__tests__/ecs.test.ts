import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, resetEntityIdCounter } from '../ecs/Entity';
import { ECSWorld } from '../ecs/ECSWorld';
import { createPosition, createHealth } from '../ecs/Component';

describe('ECS', () => {
  beforeEach(() => { resetEntityIdCounter(); });

  describe('Entity', () => {
    it('should create entity with unique ID', () => {
      const e1 = new Entity('player');
      const e2 = new Entity('enemy');
      expect(e1.id).toBe('player_0');
      expect(e2.id).toBe('enemy_1');
    });

    it('should add and get components', () => {
      const e = new Entity('test');
      e.addComponent(createPosition(10, 20, 30));
      const pos = e.getComponent<ReturnType<typeof createPosition>>('position');
      expect(pos).toBeDefined();
      expect(pos!.x).toBe(10);
      expect(pos!.y).toBe(20);
    });

    it('should check component presence', () => {
      const e = new Entity('test');
      e.addComponent(createHealth(100));
      expect(e.hasComponent('health')).toBe(true);
      expect(e.hasComponent('position')).toBe(false);
      expect(e.hasComponents('health')).toBe(true);
    });

    it('should remove components', () => {
      const e = new Entity('test');
      e.addComponent(createPosition());
      e.removeComponent('position');
      expect(e.hasComponent('position')).toBe(false);
    });
  });

  describe('ECSWorld', () => {
    let world: ECSWorld;
    beforeEach(() => { world = new ECSWorld(); });

    it('should add and retrieve entities', () => {
      const e = new Entity('test');
      world.addEntity(e);
      expect(world.getEntity(e.id)).toBe(e);
      expect(world.entityCount).toBe(1);
    });

    it('should query entities by components', () => {
      const e1 = new Entity('a');
      e1.addComponent(createPosition()).addComponent(createHealth(100));
      const e2 = new Entity('b');
      e2.addComponent(createPosition());
      world.addEntity(e1);
      world.addEntity(e2);

      const withHealth = world.query('position', 'health');
      expect(withHealth).toHaveLength(1);
      expect(withHealth[0].id).toBe(e1.id);
    });

    it('should query by tag', () => {
      world.addEntity(new Entity('warrior'));
      world.addEntity(new Entity('warrior'));
      world.addEntity(new Entity('player'));
      expect(world.queryByTag('warrior')).toHaveLength(2);
    });

    it('should remove entities', () => {
      const e = new Entity('test');
      world.addEntity(e);
      world.removeEntity(e.id);
      world.update(0); // deferred removal
      expect(world.entityCount).toBe(0);
    });

    it('should destroy all', () => {
      world.addEntity(new Entity('a'));
      world.addEntity(new Entity('b'));
      world.destroy();
      expect(world.entityCount).toBe(0);
    });
  });
});
