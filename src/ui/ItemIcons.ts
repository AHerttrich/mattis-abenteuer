/**
 * ItemIcons — Shared emoji icon registry for all items.
 * Used by HUD, CraftingUI, and InventoryUI for consistent visual display.
 */

import { getItemDef } from '../crafting/Item';

// ── Emoji icons for every item ───────────────────────────────
const ITEM_ICONS: Record<string, string> = {
  // Blocks
  dirt: '🟫',
  cobblestone: '🪨',
  stone_brick: '🧱',
  mossy_stone: '🧱',
  wood_oak: '🪵',
  wood_birch: '🌳',
  wood_dark: '🪵',
  planks_oak: '📋',
  planks_birch: '📋',
  planks_dark: '📋',
  sand: '🏖️',
  sandstone: '🏜️',
  marble: '🤍',
  brick: '🧱',
  glass: '🪟',
  torch: '🔥',
  anvil: '⚒️',
  iron_block: '🔲',
  gold_block: '🟨',
  crystal_block: '🟣',
  banner_player: '🔵',
  banner_enemy: '🔴',

  // Raw materials
  coal: '⚫',
  iron_ore: '🔩',
  gold_ore: '🥇',
  crystal: '💎',
  diamond: '💠',
  iron_ingot: '🔧',
  gold_ingot: '🪙',
  stick: '🥢',
  string: '🧵',
  clay: '🫧',
  gravel: '⬜',
  snowball: '🤍',
  oak_log: '🪵',
  arrow: '➡️',

  // Tools — differentiated by tier where possible
  wood_pickaxe: '⛏️',
  stone_pickaxe: '⛏️',
  iron_pickaxe: '⛏️',
  crystal_pickaxe: '💜',
  wood_axe: '🪓',
  stone_axe: '🪓',
  iron_axe: '🪓',
  crystal_axe: '💜',
  wood_shovel: '🥄',

  // Weapons
  wood_sword: '🗡️',
  stone_sword: '🗡️',
  iron_sword: '⚔️',
  gold_sword: '✨',
  crystal_sword: '💎',
  diamond_sword: '🔱',
  bow: '🏹',

  // Armor
  iron_helmet: '🪖',
  iron_chestplate: '🛡️',
  iron_leggings: '👖',
  iron_boots: '👢',

  // Siege
  catapult_frame: '🏗️',
  boulder: '🪨',

  // Food
  bread: '🍞',
  apple: '🍎',
  cooked_meat: '🍖',
  golden_apple: '🌟',
};

/** Get the emoji icon for an item ID. Falls back to 📦 for unknown items. */
export function getItemIcon(itemId: string): string {
  return ITEM_ICONS[itemId] ?? '📦';
}

/** Get a tier-based border color for UI slots. */
export function getItemTierColor(itemId: string): string {
  const def = getItemDef(itemId);
  if (!def) return 'rgba(255,255,255,0.1)';
  if (def.tier) {
    const tierColors: Record<number, string> = {
      1: 'rgba(139,90,43,0.5)', // wood
      2: 'rgba(150,150,150,0.5)', // stone
      3: 'rgba(200,200,210,0.6)', // iron
      4: 'rgba(255,215,0,0.5)', // gold
      5: 'rgba(138,43,226,0.5)', // crystal
      6: 'rgba(0,191,255,0.6)', // diamond
    };
    return tierColors[def.tier] ?? 'rgba(255,255,255,0.1)';
  }
  return 'rgba(255,255,255,0.08)';
}
