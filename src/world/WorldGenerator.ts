/**
 * WorldGenerator — Procedural terrain with 6 biomes.
 *
 * Biomes: Forest, Plains, Desert, Tundra, Swamp, Mountain
 * Each has unique surface, sub-surface, vegetation, and features.
 */

import { CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL } from '../utils/constants';
import { BlockType } from './BlockType';
import type { Chunk } from './Chunk';
import { SimplexNoise } from './SimplexNoise';

export enum Biome {
  FOREST = 'forest',
  PLAINS = 'plains',
  DESERT = 'desert',
  TUNDRA = 'tundra',
  SWAMP = 'swamp',
  MOUNTAIN = 'mountain',
}

export class WorldGenerator {
  private noise: SimplexNoise;
  private seed: number;

  constructor(seed = 42) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
  }

  generate(chunk: Chunk): void {
    if (chunk.generated) return;
    this.generateTerrain(chunk);
    this.carveCaves(chunk);
    this.placeLavaAndChests(chunk);
    this.generateOres(chunk);
    this.generateVegetation(chunk);
    this.fillBedrock(chunk);
    chunk.generated = true;
    chunk.dirty = true;
  }

  /** Determine biome at a world position. */
  getBiome(wx: number, wz: number): Biome {
    const temp = this.noise.noise2D(wx * 0.005, wz * 0.005);
    const moist = this.noise.noise2D(wx * 0.005 + 1000, wz * 0.005 + 1000);
    const continent = (this.noise.fbm2D(wx * 0.002, wz * 0.002, 3) + 1) * 0.5;

    if (continent > 0.65) return Biome.MOUNTAIN;
    if (temp > 0.35 && moist < -0.15) return Biome.DESERT;
    if (temp < -0.3) return Biome.TUNDRA;
    if (moist > 0.3 && temp > -0.1) return Biome.SWAMP;
    if (moist > 0 && temp > -0.2) return Biome.FOREST;
    return Biome.PLAINS;
  }

  private generateTerrain(chunk: Chunk): void {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = chunk.worldX + lx;
        const wz = chunk.worldZ + lz;
        const continent = (this.noise.fbm2D(wx * 0.002, wz * 0.002, 3) + 1) * 0.5;
        const base = SEA_LEVEL + this.noise.fbm2D(wx * 0.01, wz * 0.01, 4) * 15;
        const mountain = Math.max(0, continent - 0.6) * 60;
        const detail = this.noise.fbm2D(wx * 0.05, wz * 0.05, 2) * 3;
        const height = Math.min(Math.floor(base + mountain + detail), CHUNK_HEIGHT - 2);
        const biome = this.getBiome(wx, wz);

        for (let y = 0; y <= height; y++) {
          let block: BlockType;
          if (y === height) {
            block = this.surfaceBlock(biome, height);
          } else if (y > height - 4) {
            block = this.subsurfaceBlock(biome);
          } else {
            block = BlockType.STONE;
          }
          chunk.setBlock(lx, y, lz, block);
        }

        // Water fill
        for (let y = height + 1; y <= SEA_LEVEL; y++) {
          if (chunk.getBlock(lx, y, lz) === BlockType.AIR) {
            chunk.setBlock(lx, y, lz, biome === Biome.SWAMP ? BlockType.WATER : BlockType.WATER);
          }
        }

        // Ice on water in tundra
        if (biome === Biome.TUNDRA && height < SEA_LEVEL) {
          chunk.setBlock(lx, SEA_LEVEL, lz, BlockType.ICE);
        }
      }
    }
  }

  private surfaceBlock(biome: Biome, height: number): BlockType {
    if (height > SEA_LEVEL + 30) return BlockType.SNOW;
    if (height > SEA_LEVEL + 25) return BlockType.STONE;
    switch (biome) {
      case Biome.DESERT: return BlockType.SAND;
      case Biome.TUNDRA: return BlockType.SNOW;
      case Biome.SWAMP: return BlockType.CLAY;
      case Biome.MOUNTAIN: return height > SEA_LEVEL + 15 ? BlockType.STONE : BlockType.GRASS;
      case Biome.FOREST: return BlockType.GRASS;
      case Biome.PLAINS: return BlockType.GRASS;
      default: return BlockType.GRASS;
    }
  }

  private subsurfaceBlock(biome: Biome): BlockType {
    switch (biome) {
      case Biome.DESERT: return BlockType.SANDSTONE;
      case Biome.TUNDRA: return BlockType.DIRT;
      case Biome.SWAMP: return BlockType.CLAY;
      case Biome.MOUNTAIN: return BlockType.STONE;
      default: return BlockType.DIRT;
    }
  }

  /**
   * Carve caves using 3D noise — creates underground tunnel networks.
   * Uses two noise channels: one for the main cave shape and one for
   * a "spaghetti" tunnel effect. Caves only form below surface-10.
   */
  private carveCaves(chunk: Chunk): void {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = chunk.worldX + lx;
        const wz = chunk.worldZ + lz;
        const surfaceY = chunk.getHeightAt(lx, lz);
        const maxCaveY = Math.min(surfaceY - 10, CHUNK_HEIGHT - 5);

        for (let y = 2; y < maxCaveY; y++) {
          if (chunk.getBlock(lx, y, lz) === BlockType.AIR) continue;

          // Primary cave noise — large chambers
          const n1 = this.noise.noise3D(wx * 0.035, y * 0.06, wz * 0.035);
          // Secondary noise — spaghetti tunnels
          const n2 = this.noise.noise3D(wx * 0.07 + 300, y * 0.09 + 300, wz * 0.07 + 300);

          // Combine: caves where both channels align (intersection carving)
          const combined = Math.abs(n1) + Math.abs(n2);

          // Lower threshold = more caves. ~0.3 gives natural-looking density.
          // Deeper caves are slightly wider (threshold decreases with depth)
          const depthFactor = 1.0 - (y / maxCaveY) * 0.15;
          if (combined < 0.28 * depthFactor) {
            chunk.setBlock(lx, y, lz, BlockType.AIR);
          }
        }
      }
    }
  }

  /**
   * Place lava pools at y<8 and occasional chests in cave air pockets.
   */
  private placeLavaAndChests(chunk: Chunk): void {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let y = 2; y < 8; y++) {
          // Lava pools at bottom of caves
          if (chunk.getBlock(lx, y, lz) === BlockType.AIR && chunk.getBlock(lx, y - 1, lz) !== BlockType.AIR) {
            chunk.setBlock(lx, y, lz, BlockType.LAVA);
          }
        }
        // Chests in cave air pockets (rare)
        for (let y = 10; y < 50; y++) {
          if (chunk.getBlock(lx, y, lz) === BlockType.AIR &&
              chunk.getBlock(lx, y - 1, lz) === BlockType.STONE) {
            const wx = chunk.worldX + lx, wz = chunk.worldZ + lz;
            const n = this.noise.noise3D(wx * 0.3, y * 0.3, wz * 0.3);
            if (n > 0.92) { // Very rare
              chunk.setBlock(lx, y, lz, BlockType.CHEST);
            }
          }
        }
      }
    }
  }

  private generateOres(chunk: Chunk): void {
    for (let y = 1; y < CHUNK_HEIGHT - 1; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          if (chunk.getBlock(x, y, z) !== BlockType.STONE) continue;
          const wx = chunk.worldX + x, wz = chunk.worldZ + z;
          const n1 = this.noise.noise3D(wx * 0.1, y * 0.1, wz * 0.1);
          const n2 = this.noise.noise3D(wx * 0.08 + 500, y * 0.08, wz * 0.08 + 500);

          // Depth-based distribution: common ores near surface, rare ones deep
          // Coal: y < 60, common
          if (y < 60 && n1 > 0.55) chunk.setBlock(x, y, z, BlockType.COAL_ORE);
          // Iron: y < 45, moderate
          else if (y < 45 && n1 > 0.65) chunk.setBlock(x, y, z, BlockType.IRON_ORE);
          // Gold: y < 30, uncommon
          else if (y < 30 && n2 > 0.72) chunk.setBlock(x, y, z, BlockType.GOLD_ORE);
          // Crystal: y < 20, rare
          else if (y < 20 && n1 > 0.78) chunk.setBlock(x, y, z, BlockType.CRYSTAL_ORE);
          // Diamond: y < 12, very rare
          else if (y < 12 && n2 > 0.82) chunk.setBlock(x, y, z, BlockType.DIAMOND_ORE);
        }
      }
    }
  }

  private generateVegetation(chunk: Chunk): void {
    for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
      for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
        const wx = chunk.worldX + lx, wz = chunk.worldZ + lz;
        const biome = this.getBiome(wx, wz);
        const treeNoise = this.noise.noise2D(wx * 0.5, wz * 0.5);
        const sy = chunk.getHeightAt(lx, lz);

        if (sy <= SEA_LEVEL || sy >= CHUNK_HEIGHT - 8) continue;
        const surfBlock = chunk.getBlock(lx, sy, lz);

        // Trees by biome
        if (biome === Biome.FOREST && surfBlock === BlockType.GRASS && treeNoise > 0.45) {
          this.placeTree(chunk, lx, sy, lz, 'oak');
        } else if (biome === Biome.PLAINS && surfBlock === BlockType.GRASS && treeNoise > 0.75) {
          this.placeTree(chunk, lx, sy, lz, 'birch');
        } else if (biome === Biome.SWAMP && surfBlock === BlockType.CLAY && treeNoise > 0.5) {
          this.placeTree(chunk, lx, sy, lz, 'dark');
        } else if (biome === Biome.TUNDRA && surfBlock === BlockType.SNOW && treeNoise > 0.7) {
          this.placeTree(chunk, lx, sy, lz, 'dark'); // spruce-like
        }

        // Cacti in desert
        if (biome === Biome.DESERT && surfBlock === BlockType.SAND && treeNoise > 0.8) {
          const cactusH = 2 + Math.floor(this.noise.noise2D(wx * 0.7, wz * 0.7) + 1);
          for (let dy = 1; dy <= cactusH; dy++) {
            if (chunk.inBounds(lx, sy + dy, lz)) {
              chunk.setBlock(lx, sy + dy, lz, BlockType.LEAVES_OAK); // use green as cactus
            }
          }
        }
      }
    }
  }

  private placeTree(chunk: Chunk, lx: number, sy: number, lz: number, variant: 'oak' | 'birch' | 'dark'): void {
    const wood = variant === 'birch' ? BlockType.WOOD_BIRCH : variant === 'dark' ? BlockType.WOOD_DARK : BlockType.WOOD_OAK;
    const leaf = variant === 'birch' ? BlockType.LEAVES_BIRCH : BlockType.LEAVES_OAK;
    const th = variant === 'dark' ? 6 : variant === 'birch' ? 5 : 4 + Math.floor(this.noise.noise2D(lx * 3, lz * 3) + 1);

    // Trunk
    for (let dy = 0; dy < th; dy++) {
      if (chunk.inBounds(lx, sy + 1 + dy, lz)) chunk.setBlock(lx, sy + 1 + dy, lz, wood);
    }

    // Crown
    const cs = sy + 1 + th - 1;
    for (let dy = 0; dy <= 3; dy++) {
      const r = dy <= 1 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r) continue;
          if (dx === 0 && dz === 0 && dy < 2) continue;
          const bx = lx + dx, by = cs + dy, bz = lz + dz;
          if (chunk.inBounds(bx, by, bz) && chunk.getBlock(bx, by, bz) === BlockType.AIR) {
            chunk.setBlock(bx, by, bz, leaf);
          }
        }
      }
    }
  }

  private fillBedrock(chunk: Chunk): void {
    for (let x = 0; x < CHUNK_SIZE; x++)
      for (let z = 0; z < CHUNK_SIZE; z++)
        chunk.setBlock(x, 0, z, BlockType.BEDROCK);
  }

  getHeightAtWorld(wx: number, wz: number): number {
    const continent = (this.noise.fbm2D(wx * 0.002, wz * 0.002, 3) + 1) * 0.5;
    const base = SEA_LEVEL + this.noise.fbm2D(wx * 0.01, wz * 0.01, 4) * 15;
    const mountain = Math.max(0, continent - 0.6) * 60;
    const detail = this.noise.fbm2D(wx * 0.05, wz * 0.05, 2) * 3;
    return Math.floor(base + mountain + detail);
  }

  get currentSeed(): number { return this.seed; }
}
