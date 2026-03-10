/**
 * CraftingSystem — Recipe registry and crafting logic.
 */

import { eventBus, Events } from '../utils';
import type { Inventory } from './Inventory';
import { getItemDef } from './Item';

export enum CraftingStation {
  HAND = 'hand',
  WORKBENCH = 'workbench',
  FORGE = 'forge',
  ARMORY = 'armory',
  SIEGE_WORKSHOP = 'siege_workshop',
  ANVIL = 'anvil',
}

export interface CraftingRecipe {
  id: string;
  name: string;
  ingredients: { itemId: string; count: number }[];
  result: { itemId: string; count: number };
  station: CraftingStation;
}

const RECIPES: CraftingRecipe[] = [];

function recipe(r: CraftingRecipe): void {
  RECIPES.push(r);
}

// ── Hand crafting (no workbench needed) ──────────────────────
recipe({
  id: 'r_planks_oak',
  name: 'Oak Planks',
  ingredients: [{ itemId: 'wood_oak', count: 1 }],
  result: { itemId: 'planks_oak', count: 4 },
  station: CraftingStation.HAND,
});
recipe({
  id: 'r_planks_birch',
  name: 'Birch Planks',
  ingredients: [{ itemId: 'wood_birch', count: 1 }],
  result: { itemId: 'planks_birch', count: 4 },
  station: CraftingStation.HAND,
});
recipe({
  id: 'r_sticks',
  name: 'Sticks',
  ingredients: [{ itemId: 'planks_oak', count: 2 }],
  result: { itemId: 'stick', count: 4 },
  station: CraftingStation.HAND,
});
recipe({
  id: 'r_torch',
  name: 'Torch',
  ingredients: [
    { itemId: 'stick', count: 1 },
    { itemId: 'coal', count: 1 },
  ],
  result: { itemId: 'torch', count: 4 },
  station: CraftingStation.HAND,
});

// ── Workbench recipes ────────────────────────────────────────
recipe({
  id: 'r_wood_pickaxe',
  name: 'Wooden Pickaxe',
  ingredients: [
    { itemId: 'planks_oak', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'wood_pickaxe', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_wood_axe',
  name: 'Wooden Axe',
  ingredients: [
    { itemId: 'planks_oak', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'wood_axe', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_wood_shovel',
  name: 'Wooden Shovel',
  ingredients: [
    { itemId: 'planks_oak', count: 1 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'wood_shovel', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_wood_sword',
  name: 'Wooden Sword',
  ingredients: [
    { itemId: 'planks_oak', count: 2 },
    { itemId: 'stick', count: 1 },
  ],
  result: { itemId: 'wood_sword', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_stone_pickaxe',
  name: 'Stone Pickaxe',
  ingredients: [
    { itemId: 'cobblestone', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'stone_pickaxe', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_stone_axe',
  name: 'Stone Axe',
  ingredients: [
    { itemId: 'cobblestone', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'stone_axe', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_stone_sword',
  name: 'Stone Sword',
  ingredients: [
    { itemId: 'cobblestone', count: 2 },
    { itemId: 'stick', count: 1 },
  ],
  result: { itemId: 'stone_sword', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_bow',
  name: 'Bow',
  ingredients: [
    { itemId: 'stick', count: 3 },
    { itemId: 'string', count: 3 },
  ],
  result: { itemId: 'bow', count: 1 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_arrow',
  name: 'Arrow',
  ingredients: [
    { itemId: 'stick', count: 1 },
    { itemId: 'gravel', count: 1 },
  ],
  result: { itemId: 'arrow', count: 4 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_stone_brick',
  name: 'Stone Brick',
  ingredients: [{ itemId: 'cobblestone', count: 4 }],
  result: { itemId: 'stone_brick', count: 4 },
  station: CraftingStation.WORKBENCH,
});
recipe({
  id: 'r_glass',
  name: 'Glass',
  ingredients: [{ itemId: 'sand', count: 4 }],
  result: { itemId: 'glass', count: 4 },
  station: CraftingStation.WORKBENCH,
});

// ── Forge recipes (smelting) ─────────────────────────────────
recipe({
  id: 'r_iron_ingot',
  name: 'Iron Ingot',
  ingredients: [
    { itemId: 'iron_ore', count: 1 },
    { itemId: 'coal', count: 1 },
  ],
  result: { itemId: 'iron_ingot', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_gold_ingot',
  name: 'Gold Ingot',
  ingredients: [
    { itemId: 'gold_ore', count: 1 },
    { itemId: 'coal', count: 1 },
  ],
  result: { itemId: 'gold_ingot', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_brick',
  name: 'Brick Block',
  ingredients: [
    { itemId: 'clay', count: 4 },
    { itemId: 'coal', count: 1 },
  ],
  result: { itemId: 'brick', count: 4 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_iron_pickaxe',
  name: 'Iron Pickaxe',
  ingredients: [
    { itemId: 'iron_ingot', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'iron_pickaxe', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_iron_axe',
  name: 'Iron Axe',
  ingredients: [
    { itemId: 'iron_ingot', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'iron_axe', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_iron_sword',
  name: 'Iron Sword',
  ingredients: [
    { itemId: 'iron_ingot', count: 2 },
    { itemId: 'stick', count: 1 },
  ],
  result: { itemId: 'iron_sword', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_gold_sword',
  name: 'Gold Sword',
  ingredients: [
    { itemId: 'gold_ingot', count: 2 },
    { itemId: 'stick', count: 1 },
  ],
  result: { itemId: 'gold_sword', count: 1 },
  station: CraftingStation.FORGE,
});

// ── Armory recipes ───────────────────────────────────────────
recipe({
  id: 'r_iron_helmet',
  name: 'Iron Helmet',
  ingredients: [{ itemId: 'iron_ingot', count: 5 }],
  result: { itemId: 'iron_helmet', count: 1 },
  station: CraftingStation.ARMORY,
});
recipe({
  id: 'r_iron_chestplate',
  name: 'Iron Chestplate',
  ingredients: [{ itemId: 'iron_ingot', count: 8 }],
  result: { itemId: 'iron_chestplate', count: 1 },
  station: CraftingStation.ARMORY,
});
recipe({
  id: 'r_iron_leggings',
  name: 'Iron Leggings',
  ingredients: [{ itemId: 'iron_ingot', count: 7 }],
  result: { itemId: 'iron_leggings', count: 1 },
  station: CraftingStation.ARMORY,
});
recipe({
  id: 'r_iron_boots',
  name: 'Iron Boots',
  ingredients: [{ itemId: 'iron_ingot', count: 4 }],
  result: { itemId: 'iron_boots', count: 1 },
  station: CraftingStation.ARMORY,
});

// ── Siege workshop recipes ───────────────────────────────────
recipe({
  id: 'r_catapult',
  name: 'Catapult Frame',
  ingredients: [
    { itemId: 'wood_dark', count: 10 },
    { itemId: 'iron_ingot', count: 5 },
    { itemId: 'string', count: 4 },
  ],
  result: { itemId: 'catapult_frame', count: 1 },
  station: CraftingStation.SIEGE_WORKSHOP,
});
recipe({
  id: 'r_boulder',
  name: 'Boulder',
  ingredients: [{ itemId: 'cobblestone', count: 8 }],
  result: { itemId: 'boulder', count: 4 },
  station: CraftingStation.SIEGE_WORKSHOP,
});

// ── Anvil recipes (Repair) ───────────────────────────────────
// Crafting the anvil itself (at a forge)
recipe({
  id: 'r_anvil',
  name: 'Anvil',
  ingredients: [{ itemId: 'iron_ingot', count: 8 }],
  result: { itemId: 'anvil', count: 1 },
  station: CraftingStation.FORGE,
});

// Repairing tools
recipe({
  id: 'r_rep_wood_pickaxe',
  name: 'Repair Wood Pickaxe',
  ingredients: [
    { itemId: 'wood_pickaxe', count: 1 },
    { itemId: 'planks_oak', count: 2 },
  ],
  result: { itemId: 'wood_pickaxe', count: 1 },
  station: CraftingStation.ANVIL,
});
recipe({
  id: 'r_rep_wood_axe',
  name: 'Repair Wood Axe',
  ingredients: [
    { itemId: 'wood_axe', count: 1 },
    { itemId: 'planks_oak', count: 2 },
  ],
  result: { itemId: 'wood_axe', count: 1 },
  station: CraftingStation.ANVIL,
});
recipe({
  id: 'r_rep_stone_pickaxe',
  name: 'Repair Stone Pickaxe',
  ingredients: [
    { itemId: 'stone_pickaxe', count: 1 },
    { itemId: 'cobblestone', count: 2 },
  ],
  result: { itemId: 'stone_pickaxe', count: 1 },
  station: CraftingStation.ANVIL,
});
recipe({
  id: 'r_rep_stone_axe',
  name: 'Repair Stone Axe',
  ingredients: [
    { itemId: 'stone_axe', count: 1 },
    { itemId: 'cobblestone', count: 2 },
  ],
  result: { itemId: 'stone_axe', count: 1 },
  station: CraftingStation.ANVIL,
});
recipe({
  id: 'r_rep_iron_pickaxe',
  name: 'Repair Iron Pickaxe',
  ingredients: [
    { itemId: 'iron_pickaxe', count: 1 },
    { itemId: 'iron_ingot', count: 2 },
  ],
  result: { itemId: 'iron_pickaxe', count: 1 },
  station: CraftingStation.ANVIL,
});
recipe({
  id: 'r_rep_iron_axe',
  name: 'Repair Iron Axe',
  ingredients: [
    { itemId: 'iron_axe', count: 1 },
    { itemId: 'iron_ingot', count: 2 },
  ],
  result: { itemId: 'iron_axe', count: 1 },
  station: CraftingStation.ANVIL,
});
recipe({
  id: 'r_rep_iron_sword',
  name: 'Repair Iron Sword',
  ingredients: [
    { itemId: 'iron_sword', count: 1 },
    { itemId: 'iron_ingot', count: 2 },
  ],
  result: { itemId: 'iron_sword', count: 1 },
  station: CraftingStation.ANVIL,
});

// ── Crystal tool recipes (require Forge) ───────────────────────
recipe({
  id: 'r_crystal_pickaxe',
  name: 'Crystal Pickaxe',
  ingredients: [
    { itemId: 'crystal', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'crystal_pickaxe', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_crystal_axe',
  name: 'Crystal Axe',
  ingredients: [
    { itemId: 'crystal', count: 3 },
    { itemId: 'stick', count: 2 },
  ],
  result: { itemId: 'crystal_axe', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_crystal_sword',
  name: 'Crystal Sword',
  ingredients: [
    { itemId: 'crystal', count: 2 },
    { itemId: 'stick', count: 1 },
  ],
  result: { itemId: 'crystal_sword', count: 1 },
  station: CraftingStation.FORGE,
});
recipe({
  id: 'r_golden_apple',
  name: 'Golden Apple',
  ingredients: [
    { itemId: 'apple', count: 1 },
    { itemId: 'gold_ingot', count: 8 },
  ],
  result: { itemId: 'golden_apple', count: 1 },
  station: CraftingStation.FORGE,
});

export class CraftingSystem {
  /** Get available recipes for a station. */
  getRecipesForStation(station: CraftingStation): CraftingRecipe[] {
    return RECIPES.filter((r) => r.station === station);
  }

  /** Get all recipes. */
  getAllRecipes(): CraftingRecipe[] {
    return [...RECIPES];
  }

  /** Check if inventory has ingredients for a recipe. */
  canCraft(recipe: CraftingRecipe, inventory: Inventory): boolean {
    return recipe.ingredients.every((ing) => inventory.hasItem(ing.itemId, ing.count));
  }

  /** Attempt to craft. Returns true on success. */
  craft(recipe: CraftingRecipe, inventory: Inventory): boolean {
    if (!this.canCraft(recipe, inventory)) return false;
    for (const ing of recipe.ingredients) inventory.removeItem(ing.itemId, ing.count);

    // Add the item
    const leftover = inventory.addItem(recipe.result.itemId, recipe.result.count);

    // If it's a tool (which stacks to 1), find the newly added item and set its durability to max
    const def = getItemDef(recipe.result.itemId);
    if (def?.durability !== undefined) {
      for (const slot of inventory.slots) {
        if (slot && slot.itemId === recipe.result.itemId && slot.durability === undefined) {
          slot.durability = def.durability;
        }
      }
    }

    if (leftover > 0) {
      eventBus.emit('inventory:full', { recipeId: recipe.id, lost: leftover });
    }
    eventBus.emit(Events.ITEM_CRAFTED, { recipeId: recipe.id, result: recipe.result });
    return true;
  }

  /** Get recipe by ID. */
  getRecipe(id: string): CraftingRecipe | undefined {
    return RECIPES.find((r) => r.id === id);
  }

  /** Get craftable recipes given current inventory. */
  getCraftableRecipes(station: CraftingStation, inventory: Inventory): CraftingRecipe[] {
    return this.getRecipesForStation(station).filter((r) => this.canCraft(r, inventory));
  }
}
