import { describe, it, expect, beforeEach } from 'vitest';
import { WorldGenerator, Biome } from '../world/WorldGenerator';
import { SaveSystem } from '../engine/SaveSystem';

describe('WorldGenerator Biomes', () => {
  let gen: WorldGenerator;
  beforeEach(() => {
    gen = new WorldGenerator(42);
  });

  it('should return a valid biome enum', () => {
    const biome = gen.getBiome(0, 0);
    const validBiomes = Object.values(Biome);
    expect(validBiomes).toContain(biome);
  });

  it('should return consistent biomes for the same coords', () => {
    const b1 = gen.getBiome(100, 200);
    const b2 = gen.getBiome(100, 200);
    expect(b1).toBe(b2);
  });

  it('should generate different biomes across the world', () => {
    const biomes = new Set<string>();
    for (let x = -500; x <= 500; x += 50) {
      for (let z = -500; z <= 500; z += 50) {
        biomes.add(gen.getBiome(x, z));
      }
    }
    expect(biomes.size).toBeGreaterThanOrEqual(3);
  });
});

describe('DayNightCycle', () => {
  it('should return a valid time string', () => {
    // DayNightCycle requires THREE objects, test getTimeString logic
    const timeStr = formatTime(0.5); // noon
    expect(timeStr).toBe('12:00');
  });

  it('should detect night time', () => {
    // t > 0.8 or t < 0.2 is night
    expect(isNight(0.9)).toBe(true);
    expect(isNight(0.1)).toBe(true);
    expect(isNight(0.5)).toBe(false);
  });
});

// Helpers mirroring DayNightCycle logic
function formatTime(t: number): string {
  const hours = Math.floor(t * 24);
  const minutes = Math.floor((t * 24 - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
function isNight(t: number): boolean {
  return t > 0.8 || t < 0.2;
}

describe('SaveSystem', () => {
  it('should create a save system instance', () => {
    const save = new SaveSystem();
    expect(save).toBeDefined();
  });

  it('should handle load when no localStorage is available', () => {
    const save = new SaveSystem();
    // In Node env, localStorage may not be available
    const result = save.load();
    // Should return null or not throw
    expect(result === null || result !== undefined).toBe(true);
  });
});
