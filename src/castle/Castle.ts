/**
 * Castle — Castle structure, buildings, and warrior spawning.
 */

import { eventBus, Events, WARRIOR_SPAWN_INTERVAL } from '../utils';
import { WarriorType } from '../ecs/Component';

export enum BuildingType {
  BARRACKS = 'barracks',
  ARCHERY_RANGE = 'archery',
  STABLE = 'stable',
  SIEGE_WORKSHOP = 'siege',
  WATCHTOWER = 'watchtower',
  WALL = 'wall',
  GATE = 'gate',
  THRONE_ROOM = 'throne',
}

export interface CastleBuilding {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  spawnsUnits: WarriorType[] | null;
  spawnInterval: number;
  lastSpawnTime: number;
}

/** Maps building types to the warriors they can spawn */
const BUILDING_SPAWNS: Record<string, WarriorType[] | null> = {
  [BuildingType.BARRACKS]: [WarriorType.SWORDSMAN, WarriorType.SHIELD_BEARER],
  [BuildingType.ARCHERY_RANGE]: [WarriorType.ARCHER],
  [BuildingType.STABLE]: [WarriorType.CAVALRY],
  [BuildingType.SIEGE_WORKSHOP]: [WarriorType.CATAPULT_OPERATOR],
  [BuildingType.WATCHTOWER]: null,
  [BuildingType.WALL]: null,
  [BuildingType.GATE]: null,
  [BuildingType.THRONE_ROOM]: null,
};

const BUILDING_HP: Record<string, number> = {
  [BuildingType.BARRACKS]: 200,
  [BuildingType.ARCHERY_RANGE]: 180,
  [BuildingType.STABLE]: 220,
  [BuildingType.SIEGE_WORKSHOP]: 250,
  [BuildingType.WATCHTOWER]: 150,
  [BuildingType.WALL]: 300,
  [BuildingType.GATE]: 400,
  [BuildingType.THRONE_ROOM]: 500,
};

export class Castle {
  readonly id: string;
  readonly owner: 'player' | 'enemy';
  x: number;
  y: number;
  z: number;
  buildings: CastleBuilding[] = [];
  private nextBuildingId = 0;

  constructor(id: string, owner: 'player' | 'enemy', x: number, y: number, z: number) {
    this.id = id;
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  addBuilding(type: BuildingType, x: number, y: number, z: number): CastleBuilding {
    const maxHp = BUILDING_HP[type] ?? 200;
    const building: CastleBuilding = {
      id: `${this.id}_bld_${this.nextBuildingId++}`,
      type,
      x,
      y,
      z,
      hp: maxHp,
      maxHp,
      spawnsUnits: BUILDING_SPAWNS[type] ?? null,
      spawnInterval: WARRIOR_SPAWN_INTERVAL,
      lastSpawnTime: 0,
    };
    this.buildings.push(building);
    eventBus.emit(Events.BUILDING_PLACED, { castleId: this.id, building });
    return building;
  }

  /** Update spawners. Returns list of warriors to spawn. */
  update(
    time: number,
  ): { buildingId: string; warriorType: WarriorType; x: number; y: number; z: number }[] {
    const spawns: {
      buildingId: string;
      warriorType: WarriorType;
      x: number;
      y: number;
      z: number;
    }[] = [];
    for (const bld of this.buildings) {
      if (!bld.spawnsUnits || bld.hp <= 0) continue;
      if (time - bld.lastSpawnTime >= bld.spawnInterval) {
        bld.lastSpawnTime = time;
        const type = bld.spawnsUnits[Math.floor(Math.random() * bld.spawnsUnits.length)];
        spawns.push({ buildingId: bld.id, warriorType: type, x: bld.x, y: bld.y + 1, z: bld.z });
        eventBus.emit(Events.WARRIOR_SPAWNED, { castleId: this.id, warriorType: type });
      }
    }
    return spawns;
  }

  /** Damage a building. Returns true if destroyed. */
  damageBuilding(buildingId: string, damage: number): boolean {
    const bld = this.buildings.find((b) => b.id === buildingId);
    if (!bld) return false;
    bld.hp = Math.max(0, bld.hp - damage);
    if (bld.hp <= 0) {
      eventBus.emit(Events.BUILDING_DESTROYED, { castleId: this.id, buildingId });
      if (bld.type === BuildingType.THRONE_ROOM) {
        eventBus.emit(Events.CASTLE_DESTROYED, { castleId: this.id, owner: this.owner });
      }
    }
    return bld.hp <= 0;
  }

  get totalHp(): number {
    return this.buildings.reduce((s, b) => s + b.hp, 0);
  }
  get maxHp(): number {
    return this.buildings.reduce((s, b) => s + b.maxHp, 0);
  }
  get isDestroyed(): boolean {
    return this.throne?.hp === 0;
  }
  get throne(): CastleBuilding | undefined {
    return this.buildings.find((b) => b.type === BuildingType.THRONE_ROOM);
  }
  get spawnBuildings(): CastleBuilding[] {
    return this.buildings.filter((b) => b.spawnsUnits && b.hp > 0);
  }

  /** Find a building whose footprint contains the given world position. */
  getBuildingAt(wx: number, wz: number): CastleBuilding | undefined {
    for (const bld of this.buildings) {
      const size = BUILDING_FOOTPRINT[bld.type] ?? 5;
      const half = Math.floor(size / 2);
      if (wx >= bld.x - half && wx <= bld.x + half && wz >= bld.z - half && wz <= bld.z + half) {
        return bld;
      }
    }
    return undefined;
  }

  /** Get axis-aligned bounding box of all buildings (world coords). */
  getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    if (this.buildings.length === 0)
      return { minX: this.x - 20, maxX: this.x + 20, minZ: this.z - 20, maxZ: this.z + 20 };
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const bld of this.buildings) {
      const size = BUILDING_FOOTPRINT[bld.type] ?? 5;
      const half = Math.floor(size / 2);
      minX = Math.min(minX, bld.x - half);
      maxX = Math.max(maxX, bld.x + half);
      minZ = Math.min(minZ, bld.z - half);
      maxZ = Math.max(maxZ, bld.z + half);
    }
    // Pad with extra space for building
    return { minX: minX - 15, maxX: maxX + 15, minZ: minZ - 15, maxZ: maxZ + 15 };
  }
}

/** Footprint size (in blocks) per building type. */
export const BUILDING_FOOTPRINT: Record<string, number> = {
  [BuildingType.BARRACKS]: 5,
  [BuildingType.ARCHERY_RANGE]: 5,
  [BuildingType.STABLE]: 5,
  [BuildingType.SIEGE_WORKSHOP]: 5,
  [BuildingType.WATCHTOWER]: 3,
  [BuildingType.WALL]: 1,
  [BuildingType.GATE]: 3,
  [BuildingType.THRONE_ROOM]: 7,
};
