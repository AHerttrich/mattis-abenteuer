/**
 * XPSystem — Experience points, levels, and stat progression.
 *
 * Players earn XP from killing enemies, mining ores, crafting, and completing quests.
 * Each level grants stat bonuses (HP, damage, mining speed, armor).
 */

import { eventBus, Events } from '../utils';

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  bonusHp: number;
  bonusDamage: number;
  bonusMiningSpeed: number;
  bonusArmor: number;
}

// XP sources
const XP_VALUES: Record<string, number> = {
  kill_swordsman: 15,
  kill_archer: 20,
  kill_cavalry: 30,
  kill_catapult: 40,
  kill_castle_boss: 100,
  kill_skeleton: 25,
  kill_spider: 20,
  mine_coal: 3,
  mine_iron: 5,
  mine_gold: 8,
  mine_crystal: 12,
  mine_diamond: 20,
  craft_item: 5,
  craft_weapon: 10,
  craft_armor: 10,
  quest_complete: 50,
  wave_clear: 30,
  structure_discover: 15,
};

export class XPSystem {
  private stats: PlayerStats;
  private levelUpCallback: ((stats: PlayerStats) => void) | null = null;

  constructor() {
    this.stats = {
      level: 1,
      xp: 0,
      xpToNext: 100,
      totalXp: 0,
      bonusHp: 0,
      bonusDamage: 0,
      bonusMiningSpeed: 0,
      bonusArmor: 0,
    };

    // Wire up XP events
    eventBus.on(Events.ENTITY_DIED, (data: any) => {
      if (data.killedBy === 'player') {
        const key = `kill_${data.warriorType ?? 'swordsman'}`;
        this.addXP(XP_VALUES[key] ?? 10);
      }
    });
    eventBus.on(Events.BLOCK_DESTROYED, (data: any) => {
      const oreMap: Record<number, string> = {
        30: 'mine_coal',
        31: 'mine_iron',
        32: 'mine_gold',
        33: 'mine_crystal',
        34: 'mine_diamond',
      };
      const key = oreMap[data.blockType];
      if (key) this.addXP(XP_VALUES[key] ?? 3);
    });
    eventBus.on('wave:cleared', () => this.addXP(XP_VALUES['wave_clear']));
    eventBus.on(Events.STRUCTURE_DISCOVERED, () => this.addXP(XP_VALUES['structure_discover']));
  }

  onLevelUp(cb: (stats: PlayerStats) => void): void {
    this.levelUpCallback = cb;
  }

  addXP(amount: number): void {
    this.stats.xp += amount;
    this.stats.totalXp += amount;

    while (this.stats.xp >= this.stats.xpToNext) {
      this.stats.xp -= this.stats.xpToNext;
      this.stats.level++;
      this.stats.xpToNext = Math.floor(100 * Math.pow(1.3, this.stats.level - 1));
      this.recalcBonuses();
      if (this.levelUpCallback) this.levelUpCallback(this.stats);
      eventBus.emit('player:level_up', { level: this.stats.level });
    }
  }

  /** Add XP for crafting. */
  addCraftXP(isWeaponOrArmor: boolean): void {
    this.addXP(XP_VALUES[isWeaponOrArmor ? 'craft_weapon' : 'craft_item']);
  }

  /** Add XP for quest completion. */
  addQuestXP(): void {
    this.addXP(XP_VALUES['quest_complete']);
  }

  private recalcBonuses(): void {
    const lvl = this.stats.level;
    this.stats.bonusHp = Math.floor(lvl * 2);
    this.stats.bonusDamage = Math.floor(lvl * 0.5);
    this.stats.bonusMiningSpeed = Math.floor(lvl * 0.15 * 10) / 10; // e.g. 0.3, 0.6
    this.stats.bonusArmor = Math.floor(lvl * 0.3);
  }

  getStats(): PlayerStats {
    return { ...this.stats };
  }
  get level(): number {
    return this.stats.level;
  }
}
