/**
 * Chunk — A 16×16×64 voxel data container.
 *
 * Chunks are the fundamental unit of the voxel world.
 * Block data is stored as a flat Uint8Array for performance.
 */

import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/constants';
import { BlockType } from './BlockType';

export class Chunk {
  /** Chunk coordinates (not world coordinates) */
  readonly cx: number;
  readonly cz: number;

  /** Block data as flat array: blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] */
  readonly blocks: Uint8Array;

  /** Whether this chunk's mesh needs rebuilding */
  dirty = true;

  /** Whether this chunk has been populated with terrain */
  generated = false;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
  }

  /**
   * Convert local (x, y, z) to array index.
   */
  private index(x: number, y: number, z: number): number {
    return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
  }

  /**
   * Get block type at local coordinates.
   */
  getBlock(x: number, y: number, z: number): BlockType {
    if (!this.inBounds(x, y, z)) return BlockType.AIR;
    return this.blocks[this.index(x, y, z)] as BlockType;
  }

  /**
   * Set block type at local coordinates.
   */
  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (!this.inBounds(x, y, z)) return;
    this.blocks[this.index(x, y, z)] = type;
    this.dirty = true;
  }

  /**
   * Check if local coordinates are within chunk bounds.
   */
  inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= 0 && x < CHUNK_SIZE &&
      y >= 0 && y < CHUNK_HEIGHT &&
      z >= 0 && z < CHUNK_SIZE
    );
  }

  /**
   * Get the world-space X of this chunk's origin.
   */
  get worldX(): number {
    return this.cx * CHUNK_SIZE;
  }

  /**
   * Get the world-space Z of this chunk's origin.
   */
  get worldZ(): number {
    return this.cz * CHUNK_SIZE;
  }

  /**
   * Convert world coordinates to local chunk coordinates.
   */
  worldToLocal(wx: number, _wy: number, wz: number): { x: number; y: number; z: number } {
    return {
      x: wx - this.worldX,
      y: _wy,
      z: wz - this.worldZ,
    };
  }

  /**
   * Get height at a local (x, z) position (highest non-air block).
   */
  getHeightAt(x: number, z: number): number {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== BlockType.AIR) {
        return y;
      }
    }
    return 0;
  }

  /**
   * Fill a range of blocks with a type.
   */
  fillRange(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    type: BlockType,
  ): void {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(CHUNK_SIZE - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(CHUNK_HEIGHT - 1, Math.max(y1, y2));
    const minZ = Math.max(0, Math.min(z1, z2));
    const maxZ = Math.min(CHUNK_SIZE - 1, Math.max(z1, z2));

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          this.blocks[this.index(x, y, z)] = type;
        }
      }
    }
    this.dirty = true;
  }

  /**
   * Count non-air blocks in this chunk.
   */
  get blockCount(): number {
    let count = 0;
    for (let i = 0; i < this.blocks.length; i++) {
      if (this.blocks[i] !== BlockType.AIR) count++;
    }
    return count;
  }

  /**
   * Unique key for this chunk. Used for Map lookups.
   */
  get key(): string {
    return Chunk.makeKey(this.cx, this.cz);
  }

  /**
   * Static key builder.
   */
  static makeKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }
}
