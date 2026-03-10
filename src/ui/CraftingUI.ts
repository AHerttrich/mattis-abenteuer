/**
 * CraftingUI — Full-screen crafting recipe browser.
 * Toggle with 'C' key. Shows recipes for available stations.
 */

import { CraftingSystem, CraftingStation } from '../crafting/CraftingSystem';
import type { CraftingRecipe } from '../crafting/CraftingSystem';
import type { Inventory } from '../crafting/Inventory';
import { getItemDef } from '../crafting/Item';
import { getItemIcon } from './ItemIcons';

export class CraftingUI {
  private overlay: HTMLDivElement;
  private recipeList: HTMLDivElement;
  private stationTabs: HTMLDivElement;
  private crafting: CraftingSystem;
  private inventory: Inventory;
  private visible = false;
  private activeStation: CraftingStation = CraftingStation.HAND;
  private onCraft: ((recipe: CraftingRecipe) => void) | null = null;

  constructor(crafting: CraftingSystem, inventory: Inventory) {
    this.crafting = crafting;
    this.inventory = inventory;

    this.overlay = document.createElement('div');
    this.overlay.id = 'crafting-ui';
    this.overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:300;display:none;font-family:monospace;color:#fff;';

    // Title
    const title = document.createElement('h1');
    title.style.cssText = 'text-align:center;padding:20px;font-size:28px;color:#f1c40f;margin:0;';
    title.textContent = '⚒️ Crafting';
    this.overlay.appendChild(title);

    // Station tabs
    this.stationTabs = document.createElement('div');
    this.stationTabs.style.cssText =
      'display:flex;justify-content:center;gap:8px;padding:0 20px 15px;';
    this.createStationTabs();
    this.overlay.appendChild(this.stationTabs);

    // Recipe list
    this.recipeList = document.createElement('div');
    this.recipeList.style.cssText =
      'max-height:60vh;overflow-y:auto;padding:0 40px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;';
    this.overlay.appendChild(this.recipeList);

    // Close hint
    const hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;padding:20px;font-size:14px;color:#7f8c8d;';
    hint.textContent = 'Press C to close · Click a recipe to craft';
    this.overlay.appendChild(hint);

    document.body.appendChild(this.overlay);
  }

  private createStationTabs(): void {
    const stations: { station: CraftingStation; label: string; icon: string }[] = [
      { station: CraftingStation.HAND, label: 'Hand', icon: '✋' },
      { station: CraftingStation.WORKBENCH, label: 'Workbench', icon: '🔨' },
      { station: CraftingStation.FORGE, label: 'Forge', icon: '🔥' },
      { station: CraftingStation.ARMORY, label: 'Armory', icon: '🛡️' },
      { station: CraftingStation.SIEGE_WORKSHOP, label: 'Siege', icon: '💣' },
      { station: CraftingStation.ANVIL, label: 'Anvil', icon: '⚒️' },
    ];

    for (const s of stations) {
      const tab = document.createElement('button');
      tab.dataset.station = s.station;
      tab.style.cssText =
        'background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:monospace;font-size:14px;transition:all 0.2s;pointer-events:auto;';
      tab.textContent = `${s.icon} ${s.label}`;
      tab.addEventListener('click', () => {
        this.activeStation = s.station;
        this.refresh();
      });
      tab.addEventListener('mouseenter', () => {
        tab.style.background = 'rgba(255,255,255,0.2)';
      });
      tab.addEventListener('mouseleave', () => {
        tab.style.background =
          tab.dataset.station === this.activeStation
            ? 'rgba(241,196,15,0.3)'
            : 'rgba(255,255,255,0.1)';
      });
      this.stationTabs.appendChild(tab);
    }
  }

  private refresh(): void {
    // Update tab styling
    const tabs = this.stationTabs.querySelectorAll('button');
    tabs.forEach((tab) => {
      const isActive = (tab as HTMLButtonElement).dataset.station === this.activeStation;
      (tab as HTMLElement).style.background = isActive
        ? 'rgba(241,196,15,0.3)'
        : 'rgba(255,255,255,0.1)';
      (tab as HTMLElement).style.borderColor = isActive ? '#f1c40f' : 'rgba(255,255,255,0.2)';
    });

    // Update recipe list
    this.recipeList.innerHTML = '';
    const recipes = this.crafting.getRecipesForStation(this.activeStation);

    for (const recipe of recipes) {
      const canCraft = this.crafting.canCraft(recipe, this.inventory);
      const card = document.createElement('div');
      card.style.cssText = `background:rgba(255,255,255,${canCraft ? '0.1' : '0.03'});border:1px solid ${canCraft ? '#2ecc71' : 'rgba(255,255,255,0.1)'};border-radius:8px;padding:12px;cursor:${canCraft ? 'pointer' : 'default'};transition:all 0.2s;pointer-events:auto;opacity:${canCraft ? '1' : '0.5'};`;

      // Recipe name with result icon
      const resultIcon = getItemIcon(recipe.result.itemId);
      const name = document.createElement('div');
      name.style.cssText = 'font-size:16px;font-weight:bold;margin-bottom:8px;color:#f1c40f;';
      name.textContent = `${resultIcon} ${recipe.name}`;
      card.appendChild(name);

      // Ingredients with icons
      const ings = document.createElement('div');
      ings.style.cssText = 'font-size:12px;color:#bdc3c7;margin-bottom:6px;';
      ings.innerHTML = recipe.ingredients
        .map((i) => {
          const def = getItemDef(i.itemId);
          const have = this.inventory.countItem(i.itemId);
          const color = have >= i.count ? '#2ecc71' : '#e74c3c';
          const icon = getItemIcon(i.itemId);
          return `<span style="color:${color}">${icon} ${def?.name ?? i.itemId} ×${i.count} (${have})</span>`;
        })
        .join(' + ');
      card.appendChild(ings);

      // Result with icon
      const result = document.createElement('div');
      result.style.cssText = 'font-size:13px;color:#3498db;';
      const rDef = getItemDef(recipe.result.itemId);
      result.textContent = `→ ${resultIcon} ${rDef?.name ?? recipe.result.itemId} ×${recipe.result.count}`;
      card.appendChild(result);

      if (canCraft) {
        // Craft 1 button
        card.addEventListener('click', () => {
          if (this.onCraft) this.onCraft(recipe);
          this.refresh();
        });
        card.addEventListener('mouseenter', () => {
          card.style.background = 'rgba(46,204,113,0.2)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.background = 'rgba(255,255,255,0.1)';
        });

        // Craft All button
        const maxCraftable = this.getMaxCraftable(recipe);
        if (maxCraftable > 1) {
          const craftAllBtn = document.createElement('button');
          craftAllBtn.style.cssText =
            'margin-top:8px;background:#2ecc71;color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-family:monospace;font-size:11px;pointer-events:auto;transition:background 0.15s;';
          craftAllBtn.textContent = `Craft All (×${maxCraftable})`;
          craftAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            for (let i = 0; i < maxCraftable; i++) {
              if (this.onCraft) this.onCraft(recipe);
            }
            this.refresh();
          });
          craftAllBtn.addEventListener('mouseenter', () => {
            craftAllBtn.style.background = '#27ae60';
          });
          craftAllBtn.addEventListener('mouseleave', () => {
            craftAllBtn.style.background = '#2ecc71';
          });
          card.appendChild(craftAllBtn);
        }
      }

      // Result tooltip
      const resultDef = getItemDef(recipe.result.itemId);
      if (resultDef) {
        const tipParts: string[] = [];
        if (resultDef.damage) tipParts.push(`⚔️${resultDef.damage}`);
        if (resultDef.armor) tipParts.push(`🛡️${resultDef.armor}`);
        if (resultDef.durability) tipParts.push(`🔧${resultDef.durability}`);
        if (tipParts.length > 0) {
          const statLine = document.createElement('div');
          statLine.style.cssText = 'font-size:10px;color:#8e44ad;margin-top:4px;';
          statLine.textContent = tipParts.join('  ');
          card.appendChild(statLine);
        }
      }

      this.recipeList.appendChild(card);
    }

    if (recipes.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText =
        'grid-column:1/-1;text-align:center;color:#7f8c8d;padding:40px;font-size:16px;';
      empty.textContent = 'No recipes available for this station.';
      this.recipeList.appendChild(empty);
    }
  }

  toggle(): void {
    this.visible = !this.visible;
    this.overlay.style.display = this.visible ? 'block' : 'none';
    if (this.visible) this.refresh();
  }

  openAtStation(station: CraftingStation): void {
    this.activeStation = station;
    this.visible = true;
    this.overlay.style.display = 'block';
    this.refresh();
  }

  setCraftCallback(cb: (recipe: CraftingRecipe) => void): void {
    this.onCraft = cb;
  }
  get isVisible(): boolean {
    return this.visible;
  }
  hide(): void {
    this.visible = false;
    this.overlay.style.display = 'none';
  }
  destroy(): void {
    this.overlay.remove();
  }

  /** How many times can we craft this recipe with current inventory? */
  private getMaxCraftable(recipe: CraftingRecipe): number {
    let max = Infinity;
    for (const ing of recipe.ingredients) {
      const have = this.inventory.countItem(ing.itemId);
      max = Math.min(max, Math.floor(have / ing.count));
    }
    return max === Infinity ? 0 : max;
  }
}
