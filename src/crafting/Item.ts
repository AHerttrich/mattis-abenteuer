/**
 * Item — Item type definitions and the item registry.
 */

export enum ItemCategory {
  BLOCK = 'block',
  TOOL = 'tool',
  WEAPON = 'weapon',
  ARMOR = 'armor',
  MATERIAL = 'material',
  SIEGE = 'siege',
  FOOD = 'food',
}

export enum ToolTier { WOOD = 1, STONE = 2, IRON = 3, GOLD = 4, CRYSTAL = 5, DIAMOND = 6 }

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  stackSize: number;
  tier?: ToolTier;
  damage?: number;
  armor?: number;
  miningSpeed?: number;
  durability?: number;
  placesBlock?: number;
  hungerRestore?: number;
  saturationRestore?: number;
}

export interface ItemStack {
  itemId: string;
  count: number;
  durability?: number;
}

/** Global item registry */
const ITEMS = new Map<string, ItemDef>();

function reg(item: ItemDef): void { ITEMS.set(item.id, item); }

// ── Block items ──────────────────────────────────────────────
reg({ id: 'dirt', name: 'Dirt', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 1 });
reg({ id: 'cobblestone', name: 'Cobblestone', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 20 });
reg({ id: 'stone_brick', name: 'Stone Brick', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 21 });
reg({ id: 'wood_oak', name: 'Oak Wood', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 4 });
reg({ id: 'wood_birch', name: 'Birch Wood', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 5 });
reg({ id: 'wood_dark', name: 'Dark Wood', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 12 });
reg({ id: 'planks_oak', name: 'Oak Planks', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 15 });
reg({ id: 'planks_birch', name: 'Birch Planks', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 16 });
reg({ id: 'planks_dark', name: 'Dark Planks', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 17 });
reg({ id: 'sand', name: 'Sand', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 40 });
reg({ id: 'sandstone', name: 'Sandstone', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 23 });
reg({ id: 'brick', name: 'Brick Block', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 60 });
reg({ id: 'glass', name: 'Glass', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 64 });
reg({ id: 'torch', name: 'Torch', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 65 });
reg({ id: 'anvil', name: 'Anvil', category: ItemCategory.BLOCK, stackSize: 64, placesBlock: 77 });

// ── Raw materials ────────────────────────────────────────────
reg({ id: 'coal', name: 'Coal', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'iron_ore', name: 'Iron Ore', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'gold_ore', name: 'Gold Ore', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'crystal', name: 'Crystal', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'diamond', name: 'Diamond', category: ItemCategory.MATERIAL, stackSize: 16 });
reg({ id: 'iron_ingot', name: 'Iron Ingot', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'gold_ingot', name: 'Gold Ingot', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'stick', name: 'Stick', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'string', name: 'String', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'clay', name: 'Clay', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'gravel', name: 'Gravel', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'snowball', name: 'Snowball', category: ItemCategory.MATERIAL, stackSize: 16 });

// ── Tools ────────────────────────────────────────────────────
reg({ id: 'wood_pickaxe', name: 'Wooden Pickaxe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.WOOD, miningSpeed: 1.5, damage: 3, durability: 60 });
reg({ id: 'stone_pickaxe', name: 'Stone Pickaxe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.STONE, miningSpeed: 2.0, damage: 4, durability: 120 });
reg({ id: 'iron_pickaxe', name: 'Iron Pickaxe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.IRON, miningSpeed: 3.0, damage: 5, durability: 250 });
reg({ id: 'wood_axe', name: 'Wooden Axe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.WOOD, miningSpeed: 1.5, damage: 4, durability: 60 });
reg({ id: 'stone_axe', name: 'Stone Axe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.STONE, miningSpeed: 2.0, damage: 5, durability: 120 });
reg({ id: 'iron_axe', name: 'Iron Axe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.IRON, miningSpeed: 3.0, damage: 6, durability: 250 });
reg({ id: 'wood_shovel', name: 'Wooden Shovel', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.WOOD, miningSpeed: 1.5, damage: 2, durability: 60 });

// ── Weapons ──────────────────────────────────────────────────
reg({ id: 'wood_sword', name: 'Wooden Sword', category: ItemCategory.WEAPON, stackSize: 1, tier: ToolTier.WOOD, damage: 5, durability: 60 });
reg({ id: 'stone_sword', name: 'Stone Sword', category: ItemCategory.WEAPON, stackSize: 1, tier: ToolTier.STONE, damage: 7, durability: 120 });
reg({ id: 'iron_sword', name: 'Iron Sword', category: ItemCategory.WEAPON, stackSize: 1, tier: ToolTier.IRON, damage: 10, durability: 250 });
reg({ id: 'gold_sword', name: 'Gold Sword', category: ItemCategory.WEAPON, stackSize: 1, tier: ToolTier.GOLD, damage: 12, durability: 40 });
reg({ id: 'crystal_sword', name: 'Crystal Sword', category: ItemCategory.WEAPON, stackSize: 1, tier: ToolTier.CRYSTAL, damage: 14, durability: 400 });
reg({ id: 'diamond_sword', name: 'Diamond Sword', category: ItemCategory.WEAPON, stackSize: 1, tier: ToolTier.DIAMOND, damage: 18, durability: 1000 });
reg({ id: 'bow', name: 'Bow', category: ItemCategory.WEAPON, stackSize: 1, damage: 8, durability: 200 });
reg({ id: 'arrow', name: 'Arrow', category: ItemCategory.MATERIAL, stackSize: 64 });

// ── Armor ────────────────────────────────────────────────────
reg({ id: 'iron_helmet', name: 'Iron Helmet', category: ItemCategory.ARMOR, stackSize: 1, armor: 3, durability: 150 });
reg({ id: 'iron_chestplate', name: 'Iron Chestplate', category: ItemCategory.ARMOR, stackSize: 1, armor: 6, durability: 200 });
reg({ id: 'iron_leggings', name: 'Iron Leggings', category: ItemCategory.ARMOR, stackSize: 1, armor: 5, durability: 175 });
reg({ id: 'iron_boots', name: 'Iron Boots', category: ItemCategory.ARMOR, stackSize: 1, armor: 2, durability: 150 });

// ── Crystal tools (fill tier gap) ─────────────────────────────
reg({ id: 'crystal_pickaxe', name: 'Crystal Pickaxe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.CRYSTAL, miningSpeed: 4.0, damage: 7, durability: 400 });
reg({ id: 'crystal_axe', name: 'Crystal Axe', category: ItemCategory.TOOL, stackSize: 1, tier: ToolTier.CRYSTAL, miningSpeed: 4.0, damage: 8, durability: 400 });

// ── Siege ────────────────────────────────────────────────────
reg({ id: 'catapult_frame', name: 'Catapult Frame', category: ItemCategory.SIEGE, stackSize: 1 });
reg({ id: 'boulder', name: 'Boulder', category: ItemCategory.SIEGE, stackSize: 16, damage: 30 });

// ── Food ─────────────────────────────────────────────────────
reg({ id: 'bread', name: 'Bread', category: ItemCategory.FOOD, stackSize: 16, hungerRestore: 5, saturationRestore: 3 });
reg({ id: 'apple', name: 'Apple', category: ItemCategory.FOOD, stackSize: 16, hungerRestore: 4, saturationRestore: 2 });
reg({ id: 'cooked_meat', name: 'Cooked Meat', category: ItemCategory.FOOD, stackSize: 16, hungerRestore: 8, saturationRestore: 5 });
reg({ id: 'golden_apple', name: 'Golden Apple', category: ItemCategory.FOOD, stackSize: 16, hungerRestore: 10, saturationRestore: 8 });
reg({ id: 'carrot', name: 'Carrot', category: ItemCategory.FOOD, stackSize: 64, hungerRestore: 4, saturationRestore: 2 });
reg({ id: 'potato', name: 'Potato', category: ItemCategory.FOOD, stackSize: 64, hungerRestore: 3, saturationRestore: 1 });

// ── Farming ──────────────────────────────────────────────────
reg({ id: 'wheat_seeds', name: 'Wheat Seeds', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'wheat', name: 'Wheat', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'pumpkin_seeds', name: 'Pumpkin Seeds', category: ItemCategory.MATERIAL, stackSize: 64 });
reg({ id: 'pumpkin', name: 'Pumpkin', category: ItemCategory.FOOD, stackSize: 16, hungerRestore: 6, saturationRestore: 3 });

// ── Potions ──────────────────────────────────────────────────
reg({ id: 'potion_healing', name: 'Healing Potion', category: ItemCategory.FOOD, stackSize: 8, hungerRestore: 0 });
reg({ id: 'potion_speed', name: 'Speed Potion', category: ItemCategory.FOOD, stackSize: 8, hungerRestore: 0 });
reg({ id: 'potion_strength', name: 'Strength Potion', category: ItemCategory.FOOD, stackSize: 8, hungerRestore: 0 });
reg({ id: 'potion_resistance', name: 'Resistance Potion', category: ItemCategory.FOOD, stackSize: 8, hungerRestore: 0 });
reg({ id: 'potion_night_vision', name: 'Night Vision Potion', category: ItemCategory.FOOD, stackSize: 8, hungerRestore: 0 });
reg({ id: 'potion_fire_resist', name: 'Fire Resist Potion', category: ItemCategory.FOOD, stackSize: 8, hungerRestore: 0 });

// ── Rare Dungeon Loot ────────────────────────────────────────
reg({ id: 'ancient_key', name: 'Ancient Key', category: ItemCategory.MATERIAL, stackSize: 1 });
reg({ id: 'enchanted_gem', name: 'Enchanted Gem', category: ItemCategory.MATERIAL, stackSize: 16 });
reg({ id: 'dragon_scale', name: 'Dragon Scale', category: ItemCategory.MATERIAL, stackSize: 16 });
reg({ id: 'phoenix_feather', name: 'Phoenix Feather', category: ItemCategory.MATERIAL, stackSize: 16 });
reg({ id: 'diamond_sword_legendary', name: 'Legendary Diamond Sword', category: ItemCategory.WEAPON, stackSize: 1, tier: ToolTier.DIAMOND, damage: 25, durability: 2000 });

export function getItemDef(id: string): ItemDef | undefined { return ITEMS.get(id); }
export function getAllItems(): ItemDef[] { return [...ITEMS.values()]; }

