import { describe, it, expect, beforeEach } from 'vitest';
import { ECSWorld, Entity, createPosition, createHealth, createTeam } from '../ecs';
import { CombatSystem } from '../combat/CombatSystem';

describe('CombatSystem', () => {
  let world: ECSWorld;
  let combat: CombatSystem;

  beforeEach(() => {
    world = new ECSWorld();
    combat = new CombatSystem(world);
  });

  it('should calculate damage with armor reduction', () => {
    expect(combat.calculateDamage(10, 0)).toBe(10);
    expect(combat.calculateDamage(10, 4)).toBe(8);
    expect(combat.calculateDamage(10, 20)).toBe(1); // min 1
  });

  it('should apply damage to entity', () => {
    const e = new Entity('test');
    const health = createHealth(100);
    e.addComponent(health);
    world.addEntity(e);

    combat.applyDamage(e, health, 30);
    expect(health.current).toBe(70);
    expect(health.isDead).toBe(false);
  });

  it('should kill entity at 0 HP', () => {
    const e = new Entity('test');
    const health = createHealth(10);
    e.addComponent(health);
    world.addEntity(e);

    combat.applyDamage(e, health, 15);
    expect(health.current).toBe(0);
    expect(health.isDead).toBe(true);
  });

  it('should find nearest enemy', () => {
    const player = new Entity('player');
    player
      .addComponent(createPosition(0, 0, 0))
      .addComponent(createHealth(100))
      .addComponent(createTeam('player'));
    world.addEntity(player);

    const enemy = new Entity('enemy');
    enemy
      .addComponent(createPosition(5, 0, 0))
      .addComponent(createHealth(50))
      .addComponent(createTeam('enemy'));
    world.addEntity(enemy);

    const nearest = combat.findNearestEnemy(player, 20);
    expect(nearest).toBeDefined();
    expect(nearest!.id).toBe(enemy.id);
  });

  it('should not find same-team entities as enemies', () => {
    const e1 = new Entity('a');
    e1.addComponent(createPosition(0, 0, 0))
      .addComponent(createHealth(100))
      .addComponent(createTeam('player'));
    const e2 = new Entity('b');
    e2.addComponent(createPosition(1, 0, 0))
      .addComponent(createHealth(100))
      .addComponent(createTeam('player'));
    world.addEntity(e1);
    world.addEntity(e2);

    expect(combat.findNearestEnemy(e1, 20)).toBeNull();
  });
});
