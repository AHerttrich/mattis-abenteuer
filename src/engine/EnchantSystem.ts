/**
 * EnchantSystem — Upgrade weapons/tools at an anvil with enchantments.
 *
 * Enchantments: fire (burn DOT), knockback, lifesteal, speed, sharpness, fortune.
 * Each enchantment costs crystals/diamonds and applies to the item in inventory.
 */

export enum Enchantment {
  FIRE = 'fire',           // target burns for 3s (2 dmg/s)
  KNOCKBACK = 'knockback', // 2x knockback distance
  LIFESTEAL = 'lifesteal', // heal 20% of damage dealt
  SPEED = 'speed',         // +30% attack/mining speed
  SHARPNESS = 'sharpness', // +4 damage
  FORTUNE = 'fortune',     // +50% drop chance from mining
}

export interface EnchantmentDef {
  id: Enchantment;
  name: string;
  icon: string;
  description: string;
  cost: { itemId: string; count: number }[];
  maxLevel: number;
}

const ENCHANT_DEFS: EnchantmentDef[] = [
  { id: Enchantment.FIRE, name: 'Fire Aspect', icon: '🔥', description: 'Target burns for 3s', cost: [{ itemId: 'crystal', count: 3 }, { itemId: 'coal', count: 10 }], maxLevel: 2 },
  { id: Enchantment.KNOCKBACK, name: 'Knockback', icon: '💨', description: '2x knockback distance', cost: [{ itemId: 'iron_ingot', count: 5 }, { itemId: 'crystal', count: 2 }], maxLevel: 2 },
  { id: Enchantment.LIFESTEAL, name: 'Lifesteal', icon: '❤️‍🔥', description: 'Heal 20% of damage', cost: [{ itemId: 'diamond', count: 1 }, { itemId: 'crystal', count: 3 }], maxLevel: 1 },
  { id: Enchantment.SPEED, name: 'Haste', icon: '⚡', description: '+30% attack/mine speed', cost: [{ itemId: 'gold_ingot', count: 5 }, { itemId: 'crystal', count: 2 }], maxLevel: 2 },
  { id: Enchantment.SHARPNESS, name: 'Sharpness', icon: '🗡️', description: '+4 damage per level', cost: [{ itemId: 'diamond', count: 1 }, { itemId: 'iron_ingot', count: 5 }], maxLevel: 3 },
  { id: Enchantment.FORTUNE, name: 'Fortune', icon: '🍀', description: '+50% mining drops', cost: [{ itemId: 'diamond', count: 2 }, { itemId: 'crystal', count: 4 }], maxLevel: 3 },
];

/** Item enchantment data stored on the item stack. */
export interface ItemEnchantments {
  [enchantId: string]: number; // enchantment id → level
}

export class EnchantSystem {
  /** Get all available enchantments. */
  getEnchantments(): EnchantmentDef[] { return ENCHANT_DEFS; }

  /** Get the cost for a specific enchantment at a given level. */
  getCost(enchantId: Enchantment, level: number): { itemId: string; count: number }[] {
    const def = ENCHANT_DEFS.find(e => e.id === enchantId);
    if (!def) return [];
    return def.cost.map(c => ({ itemId: c.itemId, count: c.count * level }));
  }

  /** Get enchantment definition. */
  getDef(enchantId: Enchantment): EnchantmentDef | undefined {
    return ENCHANT_DEFS.find(e => e.id === enchantId);
  }

  /** Calculate damage modifier from enchantments. */
  getDamageBonus(enchantments: ItemEnchantments): number {
    let bonus = 0;
    if (enchantments[Enchantment.SHARPNESS]) bonus += 4 * enchantments[Enchantment.SHARPNESS];
    return bonus;
  }

  /** Check if item has fire aspect. */
  hasFireAspect(enchantments: ItemEnchantments): boolean {
    return (enchantments[Enchantment.FIRE] ?? 0) > 0;
  }

  /** Get lifesteal percentage. */
  getLifestealPct(enchantments: ItemEnchantments): number {
    return (enchantments[Enchantment.LIFESTEAL] ?? 0) > 0 ? 0.2 : 0;
  }

  /** Get speed multiplier. */
  getSpeedMultiplier(enchantments: ItemEnchantments): number {
    return 1 + (enchantments[Enchantment.SPEED] ?? 0) * 0.3;
  }

  /** Get fortune multiplier. */
  getFortuneMultiplier(enchantments: ItemEnchantments): number {
    return 1 + (enchantments[Enchantment.FORTUNE] ?? 0) * 0.5;
  }

  /** Get knockback multiplier. */
  getKnockbackMultiplier(enchantments: ItemEnchantments): number {
    return 1 + (enchantments[Enchantment.KNOCKBACK] ?? 0);
  }
}
