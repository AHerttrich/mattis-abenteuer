/**
 * EnemyCastleGenerator — Generates a procedural enemy castle at a distant location.
 * The castle is hidden and heavily guarded.
 */

import { ENEMY_CASTLE_MIN_DISTANCE, ENEMY_CASTLE_MAX_DISTANCE } from '../utils/constants';
import { BlockType } from '../world/BlockType';
import type { ChunkManager } from '../world/ChunkManager';
import type { WorldGenerator } from '../world/WorldGenerator';
import { Castle, BuildingType } from '../castle/Castle';
import { SimplexNoise } from '../world/SimplexNoise';

export interface EnemyCastleResult {
  castle: Castle;
  x: number;
  y: number;
  z: number;
}

export class EnemyCastleGenerator {
  private worldGen: WorldGenerator;
  private noise: SimplexNoise;

  constructor(worldGen: WorldGenerator, seed: number) {
    this.worldGen = worldGen;
    this.noise = new SimplexNoise(seed + 9999);
  }

  /** Pick a location and create the enemy castle data (doesn't place blocks yet). */
  generateCastle(): EnemyCastleResult {
    // Choose random angle using noise
    const angle = (this.noise.noise2D(1.5, 2.5) + 1) * Math.PI;
    const dist =
      ENEMY_CASTLE_MIN_DISTANCE +
      (this.noise.noise2D(3.5, 4.5) + 1) *
        0.5 *
        (ENEMY_CASTLE_MAX_DISTANCE - ENEMY_CASTLE_MIN_DISTANCE);

    const cx = Math.floor(Math.cos(angle) * dist);
    const cz = Math.floor(Math.sin(angle) * dist);
    const cy = this.worldGen.getHeightAtWorld(cx, cz) + 1;

    const castle = new Castle('enemy_castle', 'enemy', cx, cy, cz);

    // Throne room (center, protected)
    castle.addBuilding(BuildingType.THRONE_ROOM, cx, cy, cz);

    // Walls around the castle
    for (let i = 0; i < 8; i++) {
      const wa = (i / 8) * Math.PI * 2;
      const wr = 18;
      const wx = cx + Math.floor(Math.cos(wa) * wr);
      const wz = cz + Math.floor(Math.sin(wa) * wr);
      const wy = this.worldGen.getHeightAtWorld(wx, wz) + 1;
      castle.addBuilding(BuildingType.WALL, wx, wy, wz);
    }

    // Watchtowers at corners
    for (let i = 0; i < 4; i++) {
      const ta = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const tr = 22;
      const tx = cx + Math.floor(Math.cos(ta) * tr);
      const tz = cz + Math.floor(Math.sin(ta) * tr);
      const ty = this.worldGen.getHeightAtWorld(tx, tz) + 1;
      castle.addBuilding(BuildingType.WATCHTOWER, tx, ty, tz);
    }

    // Gate
    const gx = cx + 20,
      gz = cz;
    const gy = this.worldGen.getHeightAtWorld(gx, gz) + 1;
    castle.addBuilding(BuildingType.GATE, gx, gy, gz);

    // Military buildings
    castle.addBuilding(BuildingType.BARRACKS, cx + 8, cy, cz + 5);
    castle.addBuilding(BuildingType.BARRACKS, cx - 8, cy, cz - 5);
    castle.addBuilding(BuildingType.ARCHERY_RANGE, cx + 5, cy, cz - 8);
    castle.addBuilding(BuildingType.STABLE, cx - 5, cy, cz + 8);
    castle.addBuilding(BuildingType.SIEGE_WORKSHOP, cx - 10, cy, cz);

    return { castle, x: cx, y: cy, z: cz };
  }

  /** Place castle blocks into the world (call once chunks are loaded). */
  placeBlocks(chunkManager: ChunkManager, castle: Castle): void {
    const cx = castle.x,
      cz = castle.z,
      cy = castle.y;

    // Clear and flatten the area
    for (let dx = -25; dx <= 25; dx++) {
      for (let dz = -25; dz <= 25; dz++) {
        const wx = cx + dx,
          wz = cz + dz;
        // Place floor
        chunkManager.setBlockAtWorld(wx, cy - 1, wz, BlockType.CASTLE_FLOOR);
        // Clear above
        for (let dy = 0; dy < 15; dy++) {
          chunkManager.setBlockAtWorld(wx, cy + dy, wz, BlockType.AIR);
        }
      }
    }

    // Build walls
    for (const bld of castle.buildings) {
      switch (bld.type) {
        case BuildingType.WALL:
          this.placeWallSegment(chunkManager, bld.x, bld.y, bld.z);
          break;
        case BuildingType.WATCHTOWER:
          this.placeTower(chunkManager, bld.x, bld.y, bld.z);
          break;
        case BuildingType.GATE:
          this.placeGate(chunkManager, bld.x, bld.y, bld.z);
          break;
        case BuildingType.THRONE_ROOM:
          this.placeThrone(chunkManager, bld.x, bld.y, bld.z);
          break;
        case BuildingType.BARRACKS:
        case BuildingType.ARCHERY_RANGE:
        case BuildingType.STABLE:
        case BuildingType.SIEGE_WORKSHOP:
          this.placeBuilding(chunkManager, bld.x, bld.y, bld.z, bld.type);
          break;
      }
    }

    // Place enemy banners
    chunkManager.setBlockAtWorld(cx, cy + 8, cz, BlockType.BANNER_ENEMY);
    chunkManager.setBlockAtWorld(cx + 20, cy + 6, cz, BlockType.BANNER_ENEMY);
  }

  private placeWallSegment(cm: ChunkManager, x: number, y: number, z: number): void {
    for (let dy = 0; dy < 5; dy++) {
      for (let d = -2; d <= 2; d++) {
        cm.setBlockAtWorld(x + d, y + dy, z, BlockType.CASTLE_WALL);
        cm.setBlockAtWorld(x, y + dy, z + d, BlockType.CASTLE_WALL);
      }
    }
    // Battlements
    for (let d = -2; d <= 2; d += 2) {
      cm.setBlockAtWorld(x + d, y + 5, z, BlockType.CASTLE_WALL);
      cm.setBlockAtWorld(x, y + 5, z + d, BlockType.CASTLE_WALL);
    }
  }

  private placeTower(cm: ChunkManager, x: number, y: number, z: number): void {
    for (let dy = 0; dy < 8; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          cm.setBlockAtWorld(x + dx, y + dy, z + dz, BlockType.CASTLE_TOWER);
        }
      }
    }
    // Hollow inside
    for (let dy = 1; dy < 7; dy++) {
      cm.setBlockAtWorld(x, y + dy, z, BlockType.AIR);
    }
    // Top platform wider
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        cm.setBlockAtWorld(x + dx, y + 8, z + dz, BlockType.CASTLE_TOWER);
      }
    }
    // Battlements on tower
    for (let d = -2; d <= 2; d += 2) {
      cm.setBlockAtWorld(x + d, y + 9, z - 2, BlockType.CASTLE_WALL);
      cm.setBlockAtWorld(x + d, y + 9, z + 2, BlockType.CASTLE_WALL);
      cm.setBlockAtWorld(x - 2, y + 9, z + d, BlockType.CASTLE_WALL);
      cm.setBlockAtWorld(x + 2, y + 9, z + d, BlockType.CASTLE_WALL);
    }
    cm.setBlockAtWorld(x, y + 9, z, BlockType.TORCH);
  }

  private placeGate(cm: ChunkManager, x: number, y: number, z: number): void {
    // Archway
    for (let dy = 0; dy < 5; dy++) {
      cm.setBlockAtWorld(x, y + dy, z - 2, BlockType.CASTLE_GATE);
      cm.setBlockAtWorld(x, y + dy, z + 2, BlockType.CASTLE_GATE);
      if (dy >= 3) cm.setBlockAtWorld(x, y + dy, z, BlockType.CASTLE_GATE);
    }
    for (let dz = -2; dz <= 2; dz++) {
      cm.setBlockAtWorld(x, y + 5, z + dz, BlockType.CASTLE_WALL);
    }
  }

  private placeThrone(cm: ChunkManager, x: number, y: number, z: number): void {
    // Throne room: 5x5 base with throne at center
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.CASTLE_FLOOR);
        for (let dy = 1; dy < 5; dy++) {
          const isWall = Math.abs(dx) === 3 || Math.abs(dz) === 3;
          cm.setBlockAtWorld(
            x + dx,
            y + dy,
            z + dz,
            isWall ? BlockType.CASTLE_WALL : BlockType.AIR,
          );
        }
        cm.setBlockAtWorld(x + dx, y + 5, z + dz, BlockType.CASTLE_WALL);
      }
    }
    // Throne block
    cm.setBlockAtWorld(x, y + 1, z, BlockType.THRONE);
    cm.setBlockAtWorld(x, y + 2, z, BlockType.THRONE);
    // Torches
    cm.setBlockAtWorld(x + 2, y + 3, z + 2, BlockType.TORCH);
    cm.setBlockAtWorld(x - 2, y + 3, z + 2, BlockType.TORCH);
    cm.setBlockAtWorld(x + 2, y + 3, z - 2, BlockType.TORCH);
    cm.setBlockAtWorld(x - 2, y + 3, z - 2, BlockType.TORCH);
  }

  private placeBuilding(
    cm: ChunkManager,
    x: number,
    y: number,
    z: number,
    type: BuildingType,
  ): void {
    switch (type) {
      case BuildingType.BARRACKS:
        this.placeBarracks(cm, x, y, z);
        break;
      case BuildingType.ARCHERY_RANGE:
        this.placeArcheryRange(cm, x, y, z);
        break;
      case BuildingType.STABLE:
        this.placeStable(cm, x, y, z);
        break;
      case BuildingType.SIEGE_WORKSHOP:
        this.placeSiegeWorkshop(cm, x, y, z);
        break;
      default:
        this.placeGenericBuilding(cm, x, y, z);
    }
  }

  private placeGenericBuilding(cm: ChunkManager, x: number, y: number, z: number): void {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.CASTLE_FLOOR);
        for (let dy = 1; dy < 4; dy++) {
          const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          cm.setBlockAtWorld(
            x + dx,
            y + dy,
            z + dz,
            isWall ? BlockType.STONE_BRICK : BlockType.AIR,
          );
        }
        cm.setBlockAtWorld(x + dx, y + 4, z + dz, BlockType.PLANKS_DARK);
      }
    }
    cm.setBlockAtWorld(x + 2, y + 1, z, BlockType.AIR);
    cm.setBlockAtWorld(x + 2, y + 2, z, BlockType.AIR);
    cm.setBlockAtWorld(x, y + 3, z, BlockType.TORCH);
  }

  private placeBarracks(cm: ChunkManager, x: number, y: number, z: number): void {
    // Stone walls, dark plank roof, beds inside, weapon racks, banner
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.CASTLE_FLOOR);
        for (let dy = 1; dy < 4; dy++) {
          const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          cm.setBlockAtWorld(
            x + dx,
            y + dy,
            z + dz,
            isWall ? BlockType.STONE_BRICK : BlockType.AIR,
          );
        }
        cm.setBlockAtWorld(x + dx, y + 4, z + dz, BlockType.PLANKS_DARK);
      }
    }
    // Door
    cm.setBlockAtWorld(x + 2, y + 1, z, BlockType.AIR);
    cm.setBlockAtWorld(x + 2, y + 2, z, BlockType.AIR);
    // Beds (planks on floor)
    cm.setBlockAtWorld(x - 1, y + 1, z - 1, BlockType.PLANKS_OAK);
    cm.setBlockAtWorld(x - 1, y + 1, z + 1, BlockType.PLANKS_OAK);
    cm.setBlockAtWorld(x + 1, y + 1, z - 1, BlockType.PLANKS_OAK);
    // Weapon rack (iron blocks on wall)
    cm.setBlockAtWorld(x - 2, y + 2, z, BlockType.IRON_BLOCK);
    // Torches
    cm.setBlockAtWorld(x, y + 3, z + 2, BlockType.TORCH);
    cm.setBlockAtWorld(x, y + 3, z - 2, BlockType.TORCH);
    // Banner outside
    cm.setBlockAtWorld(x + 2, y + 4, z, BlockType.BANNER_ENEMY);
  }

  private placeArcheryRange(cm: ChunkManager, x: number, y: number, z: number): void {
    // Open-air: low walls (2 blocks high), target posts
    cm.setBlockAtWorld(x, y, z, BlockType.CASTLE_FLOOR);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.CASTLE_FLOOR);
        // Low wall only on edges, 2 blocks high
        const isEdge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        if (isEdge) {
          cm.setBlockAtWorld(x + dx, y + 1, z + dz, BlockType.STONE_BRICK);
          cm.setBlockAtWorld(x + dx, y + 2, z + dz, BlockType.STONE_BRICK);
        }
      }
    }
    // Opening/door
    cm.setBlockAtWorld(x + 2, y + 1, z, BlockType.AIR);
    cm.setBlockAtWorld(x + 2, y + 2, z, BlockType.AIR);
    // Target posts (logs)
    cm.setBlockAtWorld(x - 1, y + 1, z - 1, BlockType.WOOD_OAK);
    cm.setBlockAtWorld(x - 1, y + 2, z - 1, BlockType.WOOD_OAK);
    cm.setBlockAtWorld(x + 1, y + 1, z + 1, BlockType.WOOD_OAK);
    cm.setBlockAtWorld(x + 1, y + 2, z + 1, BlockType.WOOD_OAK);
    // Banner
    cm.setBlockAtWorld(x - 2, y + 3, z, BlockType.BANNER_ENEMY);
  }

  private placeStable(cm: ChunkManager, x: number, y: number, z: number): void {
    // Wood frame with fence (low wall), hay bales inside
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.DIRT);
        const isEdge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        if (isEdge) {
          // Fence posts: every other block on edge
          cm.setBlockAtWorld(x + dx, y + 1, z + dz, BlockType.PLANKS_OAK);
        }
      }
    }
    // Roof on one side (lean-to)
    for (let dz = -2; dz <= 2; dz++) {
      cm.setBlockAtWorld(x - 2, y + 2, z + dz, BlockType.PLANKS_OAK);
      cm.setBlockAtWorld(x - 1, y + 2, z + dz, BlockType.PLANKS_OAK);
    }
    // Door opening
    cm.setBlockAtWorld(x + 2, y + 1, z, BlockType.AIR);
    // Hay bales (gold blocks as proxy)
    cm.setBlockAtWorld(x - 1, y + 1, z - 1, BlockType.GOLD_BLOCK);
    cm.setBlockAtWorld(x - 1, y + 1, z + 1, BlockType.GOLD_BLOCK);
    // Torch
    cm.setBlockAtWorld(x, y + 2, z, BlockType.TORCH);
    // Banner
    cm.setBlockAtWorld(x + 2, y + 2, z, BlockType.BANNER_ENEMY);
  }

  private placeSiegeWorkshop(cm: ChunkManager, x: number, y: number, z: number): void {
    // Reinforced: stone brick + iron blocks, anvil inside
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.CASTLE_FLOOR);
        for (let dy = 1; dy < 4; dy++) {
          const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          // Alternate stone/iron on walls
          const blockType = isWall
            ? dy === 2 && (dx + dz) % 2 === 0
              ? BlockType.IRON_BLOCK
              : BlockType.STONE_BRICK
            : BlockType.AIR;
          cm.setBlockAtWorld(x + dx, y + dy, z + dz, blockType);
        }
        cm.setBlockAtWorld(x + dx, y + 4, z + dz, BlockType.IRON_BLOCK);
      }
    }
    // Door
    cm.setBlockAtWorld(x + 2, y + 1, z, BlockType.AIR);
    cm.setBlockAtWorld(x + 2, y + 2, z, BlockType.AIR);
    // Anvil
    cm.setBlockAtWorld(x, y + 1, z, BlockType.ANVIL);
    // Torches
    cm.setBlockAtWorld(x - 1, y + 3, z - 1, BlockType.TORCH);
    cm.setBlockAtWorld(x + 1, y + 3, z + 1, BlockType.TORCH);
    // Banner
    cm.setBlockAtWorld(x + 2, y + 4, z, BlockType.BANNER_ENEMY);
  }
}
