import { describe, it, expect } from 'vitest';
import { Chunk } from '../world/Chunk';
import { BlockType } from '../world/BlockType';
import { SimplexNoise } from '../world/SimplexNoise';
import { WorldGenerator } from '../world/WorldGenerator';
import { CHUNK_SIZE } from '../utils/constants';

describe('World', () => {
  describe('Chunk', () => {
    it('should create empty chunk', () => {
      const c = new Chunk(0, 0);
      expect(c.getBlock(0, 0, 0)).toBe(BlockType.AIR);
      expect(c.blockCount).toBe(0);
    });

    it('should set and get blocks', () => {
      const c = new Chunk(0, 0);
      c.setBlock(5, 10, 5, BlockType.STONE);
      expect(c.getBlock(5, 10, 5)).toBe(BlockType.STONE);
    });

    it('should return AIR for out-of-bounds', () => {
      const c = new Chunk(0, 0);
      expect(c.getBlock(-1, 0, 0)).toBe(BlockType.AIR);
      expect(c.getBlock(CHUNK_SIZE, 0, 0)).toBe(BlockType.AIR);
    });

    it('should compute world coordinates', () => {
      const c = new Chunk(3, -2);
      expect(c.worldX).toBe(3 * CHUNK_SIZE);
      expect(c.worldZ).toBe(-2 * CHUNK_SIZE);
    });

    it('should fill a range', () => {
      const c = new Chunk(0, 0);
      c.fillRange(0, 0, 0, 3, 3, 3, BlockType.STONE);
      expect(c.getBlock(0, 0, 0)).toBe(BlockType.STONE);
      expect(c.getBlock(3, 3, 3)).toBe(BlockType.STONE);
      expect(c.getBlock(4, 4, 4)).toBe(BlockType.AIR);
    });

    it('should compute height at position', () => {
      const c = new Chunk(0, 0);
      c.setBlock(5, 10, 5, BlockType.GRASS);
      c.setBlock(5, 9, 5, BlockType.DIRT);
      expect(c.getHeightAt(5, 5)).toBe(10);
    });

    it('should make correct key', () => {
      expect(Chunk.makeKey(3, -2)).toBe('3,-2');
    });
  });

  describe('SimplexNoise', () => {
    it('should be deterministic with same seed', () => {
      const n1 = new SimplexNoise(42);
      const n2 = new SimplexNoise(42);
      expect(n1.noise2D(0.5, 0.5)).toBe(n2.noise2D(0.5, 0.5));
    });

    it('should produce different output for different seeds', () => {
      const n1 = new SimplexNoise(1);
      const n2 = new SimplexNoise(2);
      expect(n1.noise2D(0.5, 0.5)).not.toBe(n2.noise2D(0.5, 0.5));
    });

    it('should return values in [-1, 1] range', () => {
      const n = new SimplexNoise(42);
      for (let i = 0; i < 100; i++) {
        const v = n.noise2D(i * 0.1, i * 0.07);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it('should support fbm2D', () => {
      const n = new SimplexNoise(42);
      const v = n.fbm2D(0.5, 0.5, 4);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  describe('WorldGenerator', () => {
    it('should generate terrain for a chunk', () => {
      const gen = new WorldGenerator(42);
      const c = new Chunk(0, 0);
      gen.generate(c);
      expect(c.generated).toBe(true);
      expect(c.blockCount).toBeGreaterThan(0);
      expect(c.getBlock(0, 0, 0)).toBe(BlockType.BEDROCK);
    });

    it('should be deterministic', () => {
      const gen1 = new WorldGenerator(42);
      const gen2 = new WorldGenerator(42);
      const c1 = new Chunk(5, 5);
      const c2 = new Chunk(5, 5);
      gen1.generate(c1);
      gen2.generate(c2);
      for (let i = 0; i < c1.blocks.length; i++) {
        expect(c1.blocks[i]).toBe(c2.blocks[i]);
      }
    });

    it('should not regenerate already-generated chunks', () => {
      const gen = new WorldGenerator(42);
      const c = new Chunk(0, 0);
      gen.generate(c);
      const count = c.blockCount;
      gen.generate(c);
      expect(c.blockCount).toBe(count);
    });
  });
});
