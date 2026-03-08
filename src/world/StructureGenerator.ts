/**
 * StructureGenerator — Places special structures in the world:
 * dungeons, ruins, treasure vaults, and NPC villages.
 */

import { SimplexNoise } from './SimplexNoise';
import { BlockType } from './BlockType';
import type { ChunkManager } from './ChunkManager';

export interface StructureLocation {
  type: 'dungeon' | 'ruin' | 'village' | 'treasure';
  x: number;
  y: number;
  z: number;
  placed: boolean;
}

export class StructureGenerator {
  private noise: SimplexNoise;
  private structures: StructureLocation[] = [];

  constructor(seed: number) {
    this.noise = new SimplexNoise(seed + 999);
  }

  /** Scan a region and return structure locations. */
  findStructures(centerX: number, centerZ: number, radius: number): StructureLocation[] {
    const step = 64; // check every 64 blocks
    const newStructures: StructureLocation[] = [];

    for (let x = centerX - radius; x <= centerX + radius; x += step) {
      for (let z = centerZ - radius; z <= centerZ + radius; z += step) {
        const n = this.noise.noise2D(x * 0.01, z * 0.01);

        // Check if already known
        if (this.structures.some((s) => Math.abs(s.x - x) < step && Math.abs(s.z - z) < step)) continue;

        if (n > 0.85) {
          const type = this.selectType(x, z);
          const loc: StructureLocation = { type, x, y: 0, z, placed: false };
          this.structures.push(loc);
          newStructures.push(loc);
        }
      }
    }
    return newStructures;
  }

  private selectType(x: number, z: number): 'dungeon' | 'ruin' | 'village' | 'treasure' {
    const v = Math.abs(this.noise.noise2D(x * 0.05 + 500, z * 0.05 + 500));
    if (v < 0.25) return 'dungeon';
    if (v < 0.5) return 'ruin';
    if (v < 0.75) return 'village';
    return 'treasure';
  }

  /** Place a structure's blocks into the world. */
  placeStructure(loc: StructureLocation, chunkManager: ChunkManager, groundY: number): void {
    if (loc.placed) return;
    loc.y = groundY;
    loc.placed = true;

    switch (loc.type) {
      case 'dungeon': this.placeDungeon(loc, chunkManager); break;
      case 'ruin': this.placeRuin(loc, chunkManager); break;
      case 'village': this.placeVillage(loc, chunkManager); break;
      case 'treasure': this.placeTreasure(loc, chunkManager); break;
    }
  }

  private placeDungeon(loc: StructureLocation, cm: ChunkManager): void {
    const { x, y, z } = loc;
    // Entrance
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        cm.setBlockAtWorld(x + dx, y + 1, z + dz, BlockType.STONE_BRICK);
        cm.setBlockAtWorld(x + dx, y + 2, z + dz, BlockType.AIR);
        cm.setBlockAtWorld(x + dx, y + 3, z + dz, BlockType.AIR);
        cm.setBlockAtWorld(x + dx, y + 4, z + dz, BlockType.STONE_BRICK);
      }
    }
    // Staircase down
    for (let i = 0; i < 8; i++) {
      const sy = y - i;
      cm.setBlockAtWorld(x, sy, z + i + 2, BlockType.STONE_BRICK);
      cm.setBlockAtWorld(x - 1, sy, z + i + 2, BlockType.STONE_BRICK);
      cm.setBlockAtWorld(x + 1, sy, z + i + 2, BlockType.STONE_BRICK);
      cm.setBlockAtWorld(x, sy + 1, z + i + 2, BlockType.AIR);
      cm.setBlockAtWorld(x, sy + 2, z + i + 2, BlockType.AIR);
    }
    // Underground room
    const roomY = y - 8;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dy = 0; dy <= 4; dy++) {
          const isWall = Math.abs(dx) === 3 || Math.abs(dz) === 3 || dy === 0 || dy === 4;
          cm.setBlockAtWorld(x + dx, roomY + dy, z + 10 + dz, isWall ? BlockType.STONE_BRICK : BlockType.AIR);
        }
      }
    }
    // Loot markers (torch + gold)
    cm.setBlockAtWorld(x, roomY + 1, z + 10, BlockType.GOLD_ORE);
    cm.setBlockAtWorld(x, roomY + 3, z + 10, BlockType.TORCH);
    cm.setBlockAtWorld(x - 2, roomY + 2, z + 8, BlockType.TORCH);
    cm.setBlockAtWorld(x + 2, roomY + 2, z + 8, BlockType.TORCH);
  }

  private placeRuin(loc: StructureLocation, cm: ChunkManager): void {
    const { x, y, z } = loc;
    // Crumbled walls
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const isEdge = Math.abs(dx) === 4 || Math.abs(dz) === 4;
        if (!isEdge) continue;
        const wallH = 1 + Math.floor(Math.random() * 3); // Crumbled, random height
        for (let dy = 0; dy < wallH; dy++) {
          cm.setBlockAtWorld(x + dx, y + 1 + dy, z + dz, BlockType.STONE_BRICK);
        }
      }
    }
    // Floor
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.STONE_BRICK);
      }
    }
    // Treasure in center
    cm.setBlockAtWorld(x, y + 1, z, BlockType.GOLD_ORE);
    cm.setBlockAtWorld(x, y + 2, z, BlockType.TORCH);
  }

  private placeVillage(loc: StructureLocation, cm: ChunkManager): void {
    const { x, y, z } = loc;
    // 3 small houses
    for (let h = 0; h < 3; h++) {
      const hx = x + h * 8 - 8;
      const hz = z;
      // Foundation
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          cm.setBlockAtWorld(hx + dx, y, hz + dz, BlockType.STONE_BRICK);
          const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          for (let dy = 1; dy <= 3; dy++) {
            cm.setBlockAtWorld(hx + dx, y + dy, hz + dz, isWall ? BlockType.PLANKS_OAK : BlockType.AIR);
          }
          // Roof
          cm.setBlockAtWorld(hx + dx, y + 4, hz + dz, BlockType.PLANKS_OAK);
        }
      }
      // Door
      cm.setBlockAtWorld(hx + 2, y + 1, hz, BlockType.AIR);
      cm.setBlockAtWorld(hx + 2, y + 2, hz, BlockType.AIR);
      // Light
      cm.setBlockAtWorld(hx, y + 3, hz, BlockType.TORCH);
    }
    // Well in center
    cm.setBlockAtWorld(x, y + 1, z + 5, BlockType.STONE_BRICK);
    cm.setBlockAtWorld(x + 1, y + 1, z + 5, BlockType.STONE_BRICK);
    cm.setBlockAtWorld(x - 1, y + 1, z + 5, BlockType.STONE_BRICK);
    cm.setBlockAtWorld(x, y + 1, z + 6, BlockType.STONE_BRICK);
    cm.setBlockAtWorld(x, y + 1, z + 4, BlockType.STONE_BRICK);
    cm.setBlockAtWorld(x, y, z + 5, BlockType.WATER);
  }

  private placeTreasure(loc: StructureLocation, cm: ChunkManager): void {
    const { x, y, z } = loc;
    // Small buried vault
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        cm.setBlockAtWorld(x + dx, y - 1, z + dz, BlockType.STONE_BRICK);
        cm.setBlockAtWorld(x + dx, y, z + dz, BlockType.AIR);
        cm.setBlockAtWorld(x + dx, y + 1, z + dz, BlockType.STONE_BRICK);
      }
    }
    // Treasure
    cm.setBlockAtWorld(x, y, z, BlockType.DIAMOND_ORE);
    cm.setBlockAtWorld(x - 1, y, z, BlockType.GOLD_ORE);
    cm.setBlockAtWorld(x + 1, y, z, BlockType.CRYSTAL_ORE);
    // Mark above ground
    cm.setBlockAtWorld(x, y + 2, z, BlockType.TORCH);
  }

  get allStructures(): StructureLocation[] { return this.structures; }
}
