/**
 * BlockType — Registry of all block types in the game.
 *
 * Each block type has visual and gameplay properties.
 * Block IDs are uint8 (0-255), where 0 = AIR.
 */

export enum BlockType {
  // ── Core ───────────────────────────────────
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  BEDROCK = 4,

  // ── Wood ───────────────────────────────────
  WOOD_OAK = 10,
  WOOD_BIRCH = 11,
  WOOD_DARK = 12,
  LEAVES_OAK = 13,
  LEAVES_BIRCH = 14,
  PLANKS_OAK = 15,
  PLANKS_BIRCH = 16,
  PLANKS_DARK = 17,

  // ── Stone Variants ─────────────────────────
  COBBLESTONE = 20,
  STONE_BRICK = 21,
  MOSSY_STONE = 22,
  SANDSTONE = 23,
  MARBLE = 24,

  // ── Ores ───────────────────────────────────
  COAL_ORE = 30,
  IRON_ORE = 31,
  GOLD_ORE = 32,
  CRYSTAL_ORE = 33,
  DIAMOND_ORE = 34,

  // ── Terrain ────────────────────────────────
  SAND = 40,
  GRAVEL = 41,
  CLAY = 42,
  SNOW = 43,
  ICE = 44,

  // ── Liquids ────────────────────────────────
  WATER = 50,
  LAVA = 51,

  // ── Crafted / Building ─────────────────────
  BRICK = 60,
  IRON_BLOCK = 61,
  GOLD_BLOCK = 62,
  CRYSTAL_BLOCK = 63,
  GLASS = 64,
  TORCH = 65,

  // ── Castle Specific ────────────────────────
  CASTLE_WALL = 70,
  CASTLE_FLOOR = 71,
  CASTLE_TOWER = 72,
  CASTLE_GATE = 73,
  THRONE = 74,
  BANNER_PLAYER = 75,
  BANNER_ENEMY = 76,
  ANVIL = 77,
  CHEST = 78,
}

/**
 * Block properties for rendering and gameplay.
 */
export interface BlockProperties {
  id: BlockType;
  name: string;
  color: number; // hex color for rendering
  hardness: number; // time to break (seconds), 0 = instant, -1 = unbreakable
  transparent: boolean; // can see through?
  solid: boolean; // can walk on / collide with?
  liquid: boolean;
  lightLevel: number; // 0-15
  dropItem: string | null; // item ID dropped when mined
}

/**
 * Registry of all block properties.
 */
const BLOCK_REGISTRY: Map<BlockType, BlockProperties> = new Map();

function registerBlock(props: BlockProperties): void {
  BLOCK_REGISTRY.set(props.id, props);
}

// ── Register all blocks ──────────────────────────────────────

// Core
registerBlock({
  id: BlockType.AIR,
  name: 'Air',
  color: 0x000000,
  hardness: 0,
  transparent: true,
  solid: false,
  liquid: false,
  lightLevel: 0,
  dropItem: null,
});
registerBlock({
  id: BlockType.DIRT,
  name: 'Dirt',
  color: 0x8b6914,
  hardness: 0.5,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'dirt',
});
registerBlock({
  id: BlockType.GRASS,
  name: 'Grass',
  color: 0x4a8c2a,
  hardness: 0.6,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'dirt',
});
registerBlock({
  id: BlockType.STONE,
  name: 'Stone',
  color: 0x808080,
  hardness: 1.5,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'cobblestone',
});
registerBlock({
  id: BlockType.BEDROCK,
  name: 'Bedrock',
  color: 0x333333,
  hardness: -1,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: null,
});

// Wood
registerBlock({
  id: BlockType.WOOD_OAK,
  name: 'Oak Wood',
  color: 0x6b4226,
  hardness: 2.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'wood_oak',
});
registerBlock({
  id: BlockType.WOOD_BIRCH,
  name: 'Birch Wood',
  color: 0xd3c4a1,
  hardness: 2.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'wood_birch',
});
registerBlock({
  id: BlockType.WOOD_DARK,
  name: 'Dark Wood',
  color: 0x3b2f1e,
  hardness: 2.5,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'wood_dark',
});
registerBlock({
  id: BlockType.LEAVES_OAK,
  name: 'Oak Leaves',
  color: 0x2d7a2d,
  hardness: 0.2,
  transparent: true,
  solid: false,
  liquid: false,
  lightLevel: 0,
  dropItem: null,
});
registerBlock({
  id: BlockType.LEAVES_BIRCH,
  name: 'Birch Leaves',
  color: 0x5d9e3a,
  hardness: 0.2,
  transparent: true,
  solid: false,
  liquid: false,
  lightLevel: 0,
  dropItem: null,
});
registerBlock({
  id: BlockType.PLANKS_OAK,
  name: 'Oak Planks',
  color: 0xb8945f,
  hardness: 2.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'planks_oak',
});
registerBlock({
  id: BlockType.PLANKS_BIRCH,
  name: 'Birch Planks',
  color: 0xe8d8b0,
  hardness: 2.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'planks_birch',
});
registerBlock({
  id: BlockType.PLANKS_DARK,
  name: 'Dark Planks',
  color: 0x5a4430,
  hardness: 2.5,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'planks_dark',
});

// Stone variants
registerBlock({
  id: BlockType.COBBLESTONE,
  name: 'Cobblestone',
  color: 0x6e6e6e,
  hardness: 2.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'cobblestone',
});
registerBlock({
  id: BlockType.STONE_BRICK,
  name: 'Stone Brick',
  color: 0x7a7a7a,
  hardness: 2.5,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'stone_brick',
});
registerBlock({
  id: BlockType.MOSSY_STONE,
  name: 'Mossy Stone',
  color: 0x5a7a5a,
  hardness: 2.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'mossy_stone',
});
registerBlock({
  id: BlockType.SANDSTONE,
  name: 'Sandstone',
  color: 0xd4c48c,
  hardness: 1.5,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'sandstone',
});
registerBlock({
  id: BlockType.MARBLE,
  name: 'Marble',
  color: 0xe8e4e0,
  hardness: 3.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'marble',
});

// Ores
registerBlock({
  id: BlockType.COAL_ORE,
  name: 'Coal Ore',
  color: 0x3c3c3c,
  hardness: 3.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'coal',
});
registerBlock({
  id: BlockType.IRON_ORE,
  name: 'Iron Ore',
  color: 0xb07a4b,
  hardness: 4.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'iron_ore',
});
registerBlock({
  id: BlockType.GOLD_ORE,
  name: 'Gold Ore',
  color: 0xdaa520,
  hardness: 4.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'gold_ore',
});
registerBlock({
  id: BlockType.CRYSTAL_ORE,
  name: 'Crystal Ore',
  color: 0x8a2be2,
  hardness: 5.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 2,
  dropItem: 'crystal',
});
registerBlock({
  id: BlockType.DIAMOND_ORE,
  name: 'Diamond Ore',
  color: 0x00bfff,
  hardness: 6.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 1,
  dropItem: 'diamond',
});

// Terrain
registerBlock({
  id: BlockType.SAND,
  name: 'Sand',
  color: 0xf4e4a0,
  hardness: 0.5,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'sand',
});
registerBlock({
  id: BlockType.GRAVEL,
  name: 'Gravel',
  color: 0x9e9e9e,
  hardness: 0.6,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'gravel',
});
registerBlock({
  id: BlockType.CLAY,
  name: 'Clay',
  color: 0xa0a0b8,
  hardness: 0.6,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'clay',
});
registerBlock({
  id: BlockType.SNOW,
  name: 'Snow',
  color: 0xf0f0f0,
  hardness: 0.2,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'snowball',
});
registerBlock({
  id: BlockType.ICE,
  name: 'Ice',
  color: 0xc0e0ff,
  hardness: 0.5,
  transparent: true,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: null,
});

// Liquids
registerBlock({
  id: BlockType.WATER,
  name: 'Water',
  color: 0x3060c0,
  hardness: -1,
  transparent: true,
  solid: false,
  liquid: true,
  lightLevel: 0,
  dropItem: null,
});
registerBlock({
  id: BlockType.LAVA,
  name: 'Lava',
  color: 0xff4500,
  hardness: -1,
  transparent: true,
  solid: false,
  liquid: true,
  lightLevel: 15,
  dropItem: null,
});

// Crafted
registerBlock({
  id: BlockType.BRICK,
  name: 'Brick',
  color: 0xb05a3c,
  hardness: 3.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'brick',
});
registerBlock({
  id: BlockType.IRON_BLOCK,
  name: 'Iron Block',
  color: 0xc8c8d0,
  hardness: 5.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'iron_block',
});
registerBlock({
  id: BlockType.GOLD_BLOCK,
  name: 'Gold Block',
  color: 0xffd700,
  hardness: 4.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 2,
  dropItem: 'gold_block',
});
registerBlock({
  id: BlockType.CRYSTAL_BLOCK,
  name: 'Crystal Block',
  color: 0x9945ff,
  hardness: 5.0,
  transparent: true,
  solid: true,
  liquid: false,
  lightLevel: 8,
  dropItem: 'crystal_block',
});
registerBlock({
  id: BlockType.GLASS,
  name: 'Glass',
  color: 0xd0e8ff,
  hardness: 0.3,
  transparent: true,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: null,
});
registerBlock({
  id: BlockType.TORCH,
  name: 'Torch',
  color: 0xffcc00,
  hardness: 0.0,
  transparent: true,
  solid: false,
  liquid: false,
  lightLevel: 14,
  dropItem: 'torch',
});

// Castle
registerBlock({
  id: BlockType.CASTLE_WALL,
  name: 'Castle Wall',
  color: 0x707070,
  hardness: 8.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'stone_brick',
});
registerBlock({
  id: BlockType.CASTLE_FLOOR,
  name: 'Castle Floor',
  color: 0x8a8a7a,
  hardness: 6.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'stone',
});
registerBlock({
  id: BlockType.CASTLE_TOWER,
  name: 'Castle Tower',
  color: 0x606060,
  hardness: 10.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'stone_brick',
});
registerBlock({
  id: BlockType.CASTLE_GATE,
  name: 'Castle Gate',
  color: 0x5a4020,
  hardness: 12.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'planks_dark',
});
registerBlock({
  id: BlockType.THRONE,
  name: 'Throne',
  color: 0xc0a030,
  hardness: 15.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 5,
  dropItem: null,
});
registerBlock({
  id: BlockType.BANNER_PLAYER,
  name: 'Player Banner',
  color: 0x2040c0,
  hardness: 1.0,
  transparent: true,
  solid: false,
  liquid: false,
  lightLevel: 0,
  dropItem: 'banner_player',
});
registerBlock({
  id: BlockType.BANNER_ENEMY,
  name: 'Enemy Banner',
  color: 0xc02020,
  hardness: 1.0,
  transparent: true,
  solid: false,
  liquid: false,
  lightLevel: 0,
  dropItem: 'banner_enemy',
});
registerBlock({
  id: BlockType.ANVIL,
  name: 'Anvil',
  color: 0x222222,
  hardness: 5.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'anvil',
});
registerBlock({
  id: BlockType.CHEST,
  name: 'Chest',
  color: 0x8b6914,
  hardness: 2.0,
  transparent: false,
  solid: true,
  liquid: false,
  lightLevel: 0,
  dropItem: 'chest',
});

/**
 * Get properties for a block type.
 */
export function getBlockProperties(type: BlockType): BlockProperties {
  return BLOCK_REGISTRY.get(type) ?? BLOCK_REGISTRY.get(BlockType.AIR)!;
}

/**
 * Check if a block type is solid.
 */
export function isBlockSolid(type: BlockType): boolean {
  return getBlockProperties(type).solid;
}

/**
 * Check if a block type is transparent.
 */
export function isBlockTransparent(type: BlockType): boolean {
  return getBlockProperties(type).transparent;
}

/**
 * Get block color.
 */
export function getBlockColor(type: BlockType): number {
  return getBlockProperties(type).color;
}

/**
 * Get all registered block types (excluding AIR).
 */
export function getAllBlockTypes(): BlockType[] {
  return [...BLOCK_REGISTRY.keys()].filter((t) => t !== BlockType.AIR);
}
