/**
 * PotionSystem — Brewing and active effects (health, speed, strength, resistance).
 */

export enum PotionType {
  HEALING = 'healing',
  SPEED = 'speed',
  STRENGTH = 'strength',
  RESISTANCE = 'resistance',
  NIGHT_VISION = 'night_vision',
  FIRE_RESIST = 'fire_resist',
}

export interface ActiveEffect {
  type: PotionType;
  duration: number;     // remaining seconds
  magnitude: number;    // strength multiplier
}

export interface PotionRecipe {
  result: PotionType;
  name: string;
  icon: string;
  ingredients: { itemId: string; count: number }[];
  duration: number;
  magnitude: number;
}

const POTION_RECIPES: PotionRecipe[] = [
  { result: PotionType.HEALING, name: 'Healing Potion', icon: '❤️', ingredients: [{ itemId: 'apple', count: 3 }, { itemId: 'crystal', count: 1 }], duration: 0, magnitude: 20 },
  { result: PotionType.SPEED, name: 'Speed Potion', icon: '⚡', ingredients: [{ itemId: 'gold_ingot', count: 2 }, { itemId: 'crystal', count: 1 }], duration: 30, magnitude: 1.5 },
  { result: PotionType.STRENGTH, name: 'Strength Potion', icon: '💪', ingredients: [{ itemId: 'iron_ingot', count: 3 }, { itemId: 'crystal', count: 2 }], duration: 30, magnitude: 1.5 },
  { result: PotionType.RESISTANCE, name: 'Resistance Potion', icon: '🛡️', ingredients: [{ itemId: 'cobblestone', count: 10 }, { itemId: 'crystal', count: 2 }], duration: 30, magnitude: 0.5 },
  { result: PotionType.NIGHT_VISION, name: 'Night Vision Potion', icon: '👁️', ingredients: [{ itemId: 'coal', count: 5 }, { itemId: 'crystal', count: 1 }], duration: 60, magnitude: 1 },
  { result: PotionType.FIRE_RESIST, name: 'Fire Resist Potion', icon: '🔥', ingredients: [{ itemId: 'gold_ingot', count: 3 }, { itemId: 'diamond', count: 1 }], duration: 45, magnitude: 1 },
];

export class PotionSystem {
  private activeEffects: ActiveEffect[] = [];

  getRecipes(): PotionRecipe[] { return POTION_RECIPES; }

  /** Use a potion: add its effect. */
  usePotion(type: PotionType): void {
    const recipe = POTION_RECIPES.find(r => r.result === type);
    if (!recipe) return;

    // Healing is instant
    if (type === PotionType.HEALING) {
      // Handled by caller (add HP)
      return;
    }

    // Remove existing effect of same type
    this.activeEffects = this.activeEffects.filter(e => e.type !== type);
    this.activeEffects.push({ type, duration: recipe.duration, magnitude: recipe.magnitude });
  }

  /** Update active effects. */
  update(dt: number): void {
    for (const eff of this.activeEffects) {
      eff.duration -= dt;
    }
    this.activeEffects = this.activeEffects.filter(e => e.duration > 0);
  }

  /** Get active effect modifier. */
  getSpeedMultiplier(): number {
    const eff = this.activeEffects.find(e => e.type === PotionType.SPEED);
    return eff ? eff.magnitude : 1;
  }

  getStrengthMultiplier(): number {
    const eff = this.activeEffects.find(e => e.type === PotionType.STRENGTH);
    return eff ? eff.magnitude : 1;
  }

  getDamageReduction(): number {
    const eff = this.activeEffects.find(e => e.type === PotionType.RESISTANCE);
    return eff ? eff.magnitude : 1; // 0.5 = take half damage
  }

  hasNightVision(): boolean {
    return this.activeEffects.some(e => e.type === PotionType.NIGHT_VISION);
  }

  hasFireResist(): boolean {
    return this.activeEffects.some(e => e.type === PotionType.FIRE_RESIST);
  }

  getActiveEffects(): ActiveEffect[] { return [...this.activeEffects]; }

  /** Healing amount for a healing potion. */
  getHealingAmount(): number {
    const recipe = POTION_RECIPES.find(r => r.result === PotionType.HEALING);
    return recipe ? recipe.magnitude : 20;
  }
}
