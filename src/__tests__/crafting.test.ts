import { describe, it, expect, beforeEach } from 'vitest';
import { Inventory } from '../crafting/Inventory';
import { CraftingSystem, CraftingStation } from '../crafting/CraftingSystem';
import { getItemDef } from '../crafting/Item';

describe('Crafting', () => {
  describe('Inventory', () => {
    let inv: Inventory;
    beforeEach(() => {
      inv = new Inventory(9);
    });

    it('should add items', () => {
      inv.addItem('dirt', 10);
      expect(inv.countItem('dirt')).toBe(10);
    });

    it('should stack items up to stack size', () => {
      inv.addItem('dirt', 64);
      inv.addItem('dirt', 10);
      expect(inv.countItem('dirt')).toBe(74);
      expect(inv.usedSlots).toBe(2);
    });

    it('should remove items', () => {
      inv.addItem('dirt', 20);
      expect(inv.removeItem('dirt', 5)).toBe(true);
      expect(inv.countItem('dirt')).toBe(15);
    });

    it('should fail to remove insufficient items', () => {
      inv.addItem('dirt', 5);
      expect(inv.removeItem('dirt', 10)).toBe(false);
      expect(inv.countItem('dirt')).toBe(5);
    });

    it('should check hasItem', () => {
      inv.addItem('iron_ingot', 3);
      expect(inv.hasItem('iron_ingot', 3)).toBe(true);
      expect(inv.hasItem('iron_ingot', 4)).toBe(false);
    });

    it('should manage hotbar selection', () => {
      inv.addItem('dirt', 10);
      inv.selectHotbar(0);
      const item = inv.getSelectedItem();
      expect(item?.itemId).toBe('dirt');
    });

    it('should swap slots', () => {
      inv.addItem('dirt', 5);
      inv.addItem('stone_brick', 3);
      inv.swapSlots(0, 1);
      expect(inv.slots[0]?.itemId).toBe('stone_brick');
      expect(inv.slots[1]?.itemId).toBe('dirt');
    });

    it('should clear all', () => {
      inv.addItem('dirt', 10);
      inv.clear();
      expect(inv.usedSlots).toBe(0);
    });
  });

  describe('CraftingSystem', () => {
    let crafting: CraftingSystem;
    let inv: Inventory;
    beforeEach(() => {
      crafting = new CraftingSystem();
      inv = new Inventory();
    });

    it('should list recipes for stations', () => {
      const hand = crafting.getRecipesForStation(CraftingStation.HAND);
      expect(hand.length).toBeGreaterThan(0);
    });

    it('should craft planks from wood', () => {
      inv.addItem('wood_oak', 1);
      const recipe = crafting.getRecipe('r_planks_oak')!;
      expect(crafting.canCraft(recipe, inv)).toBe(true);
      expect(crafting.craft(recipe, inv)).toBe(true);
      expect(inv.countItem('planks_oak')).toBe(4);
      expect(inv.countItem('wood_oak')).toBe(0);
    });

    it('should fail to craft without ingredients', () => {
      const recipe = crafting.getRecipe('r_iron_sword')!;
      expect(crafting.canCraft(recipe, inv)).toBe(false);
      expect(crafting.craft(recipe, inv)).toBe(false);
    });

    it('should list craftable recipes', () => {
      inv.addItem('wood_oak', 5);
      const available = crafting.getCraftableRecipes(CraftingStation.HAND, inv);
      expect(available.length).toBeGreaterThan(0);
    });

    it('should have all items defined', () => {
      const recipes = crafting.getAllRecipes();
      for (const r of recipes) {
        for (const ing of r.ingredients) {
          expect(getItemDef(ing.itemId)).toBeDefined();
        }
        expect(getItemDef(r.result.itemId)).toBeDefined();
      }
    });
  });
});
