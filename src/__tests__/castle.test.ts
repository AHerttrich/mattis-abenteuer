import { describe, it, expect, beforeEach } from 'vitest';
import { Castle, BuildingType } from '../castle/Castle';

describe('Castle', () => {
  let castle: Castle;
  beforeEach(() => { castle = new Castle('test', 'player', 100, 20, 100); });

  it('should add buildings', () => {
    castle.addBuilding(BuildingType.BARRACKS, 100, 20, 100);
    expect(castle.buildings).toHaveLength(1);
    expect(castle.buildings[0].type).toBe(BuildingType.BARRACKS);
  });

  it('should track castle HP', () => {
    castle.addBuilding(BuildingType.WALL, 0, 0, 0);
    castle.addBuilding(BuildingType.THRONE_ROOM, 5, 0, 5);
    expect(castle.totalHp).toBe(castle.maxHp);
    expect(castle.totalHp).toBe(300 + 500);
  });

  it('should damage buildings', () => {
    const bld = castle.addBuilding(BuildingType.WALL, 0, 0, 0);
    castle.damageBuilding(bld.id, 100);
    expect(bld.hp).toBe(200);
  });

  it('should detect castle destruction via throne room', () => {
    const throne = castle.addBuilding(BuildingType.THRONE_ROOM, 0, 0, 0);
    castle.damageBuilding(throne.id, 500);
    expect(castle.isDestroyed).toBe(true);
  });

  it('should spawn warriors from buildings', () => {
    castle.addBuilding(BuildingType.BARRACKS, 0, 0, 0);
    castle.addBuilding(BuildingType.ARCHERY_RANGE, 5, 0, 0);
    // No spawn before interval (lastSpawnTime defaults to 0)
    const spawns5 = castle.update(5);
    expect(spawns5).toHaveLength(0);
    // Spawn after interval (30s)
    const spawns30 = castle.update(30);
    expect(spawns30).toHaveLength(2);
    // No spawn again immediately
    const spawns31 = castle.update(31);
    expect(spawns31).toHaveLength(0);
    // Spawn again after another interval
    const spawns61 = castle.update(61);
    expect(spawns61).toHaveLength(2);
  });

  it('should not spawn from destroyed buildings', () => {
    const bld = castle.addBuilding(BuildingType.BARRACKS, 0, 0, 0);
    castle.damageBuilding(bld.id, 9999);
    const spawns = castle.update(0);
    expect(spawns).toHaveLength(0);
  });

  it('should list spawn buildings', () => {
    castle.addBuilding(BuildingType.BARRACKS, 0, 0, 0);
    castle.addBuilding(BuildingType.WALL, 5, 0, 0);
    expect(castle.spawnBuildings).toHaveLength(1);
  });
});
