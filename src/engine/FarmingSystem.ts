/**
 * FarmingSystem — Plant, grow, and harvest crops.
 *
 * Use a hoe (or right-click with seeds) on dirt/grass to create farmland.
 * Crops grow through 4 stages over time. Harvest yields food items.
 */

import { eventBus, Events } from '../utils';
import type { ChunkManager } from '../world/ChunkManager';
import { BlockType } from '../world/BlockType';

export interface CropPlot {
  x: number; y: number; z: number;
  cropType: CropType;
  growthStage: number;     // 0-3
  growthTimer: number;     // seconds until next stage
  watered: boolean;
}

export enum CropType {
  WHEAT = 'wheat',
  CARROT = 'carrot',
  POTATO = 'potato',
  PUMPKIN = 'pumpkin',
}

const CROP_DATA: Record<CropType, { growTime: number; yield: { itemId: string; count: number }; seedItem: string }> = {
  [CropType.WHEAT]:   { growTime: 60,  yield: { itemId: 'wheat',  count: 3 }, seedItem: 'wheat_seeds' },
  [CropType.CARROT]:  { growTime: 80,  yield: { itemId: 'carrot', count: 2 }, seedItem: 'carrot' },
  [CropType.POTATO]:  { growTime: 80,  yield: { itemId: 'potato', count: 2 }, seedItem: 'potato' },
  [CropType.PUMPKIN]: { growTime: 120, yield: { itemId: 'pumpkin', count: 1 }, seedItem: 'pumpkin_seeds' },
};

export class FarmingSystem {
  private crops: CropPlot[] = [];
  private chunkManager: ChunkManager;
  private harvestCallback: ((items: { itemId: string; count: number }[]) => void) | null = null;

  constructor(chunkManager: ChunkManager) {
    this.chunkManager = chunkManager;
  }

  onHarvest(cb: (items: { itemId: string; count: number }[]) => void): void {
    this.harvestCallback = cb;
  }

  /** Plant a crop at the given position. Returns true if successful. */
  plant(x: number, y: number, z: number, cropType: CropType): boolean {
    // Check if this spot is farmable (dirt/grass below, air at position)
    const below = this.chunkManager.getBlockAtWorld(x, y - 1, z);
    const at = this.chunkManager.getBlockAtWorld(x, y, z);
    if ((below !== BlockType.DIRT && below !== BlockType.GRASS) || at !== BlockType.AIR) return false;

    // Check no existing crop here
    if (this.crops.some(c => c.x === x && c.y === y && c.z === z)) return false;

    const data = CROP_DATA[cropType];
    // Check for water nearby (speeds growth)
    const watered = this.hasWaterNear(x, y, z);

    this.crops.push({
      x, y, z,
      cropType,
      growthStage: 0,
      growthTimer: watered ? data.growTime * 0.6 : data.growTime,
      watered,
    });

    // Visual: place a crop marker block
    this.chunkManager.setBlockAtWorld(x, y - 1, z, BlockType.DIRT); // farmland
    return true;
  }

  /** Try to harvest a crop at the given position. */
  harvest(x: number, y: number, z: number): boolean {
    const idx = this.crops.findIndex(c => c.x === x && c.y === y && c.z === z && c.growthStage >= 3);
    if (idx < 0) return false;

    const crop = this.crops[idx];
    const data = CROP_DATA[crop.cropType];
    this.crops.splice(idx, 1);

    // Return harvested items + chance of bonus seeds
    const items = [{ ...data.yield }];
    if (Math.random() < 0.5) items.push({ itemId: data.seedItem, count: 1 });

    if (this.harvestCallback) this.harvestCallback(items);
    eventBus.emit(Events.BLOCK_DESTROYED, { x, y: y - 1, z, blockType: BlockType.DIRT });
    return true;
  }

  /** Update crop growth. */
  update(dt: number): void {
    for (const crop of this.crops) {
      if (crop.growthStage >= 3) continue;
      crop.growthTimer -= dt;
      if (crop.growthTimer <= 0) {
        crop.growthStage++;
        if (crop.growthStage < 3) {
          const data = CROP_DATA[crop.cropType];
          crop.growthTimer = crop.watered ? data.growTime * 0.6 : data.growTime;
        }
      }
    }
  }

  /** Get crop at position (for HUD display). */
  getCropAt(x: number, y: number, z: number): CropPlot | null {
    return this.crops.find(c => c.x === x && c.y === y && c.z === z) ?? null;
  }

  private hasWaterNear(x: number, y: number, z: number): boolean {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (this.chunkManager.getBlockAtWorld(x + dx, y - 1, z + dz) === BlockType.WATER) return true;
      }
    }
    return false;
  }

  get cropCount(): number { return this.crops.length; }
}
