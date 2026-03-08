/**
 * AchievementSystem — Track milestones and show popup notifications.
 */

import { eventBus, Events } from '../utils';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export class AchievementSystem {
  private achievements: Achievement[] = [
    { id: 'first_mine', name: 'Stone Age', description: 'Mine your first block', icon: '⛏️', unlocked: false },
    { id: 'first_craft', name: 'Crafter', description: 'Craft your first item', icon: '🔨', unlocked: false },
    { id: 'first_kill', name: 'First Blood', description: 'Defeat an enemy', icon: '⚔️', unlocked: false },
    { id: 'iron_age', name: 'Iron Age', description: 'Craft an iron tool', icon: '🔧', unlocked: false },
    { id: 'first_castle', name: 'Lord of the Keep', description: 'Build your first castle', icon: '🏰', unlocked: false },
    { id: 'wave_5', name: 'Wave Warrior', description: 'Survive wave 5', icon: '🌊', unlocked: false },
    { id: 'wave_10', name: 'Siege Master', description: 'Survive wave 10', icon: '🏴', unlocked: false },
    { id: 'diamond_found', name: 'Diamond!', description: 'Find a diamond', icon: '💎', unlocked: false },
    { id: 'village_found', name: 'Civilization', description: 'Discover a village', icon: '🏘️', unlocked: false },
    { id: 'first_trade', name: 'Merchant', description: 'Complete a trade', icon: '🤝', unlocked: false },
    { id: 'level_5', name: 'Apprentice', description: 'Reach level 5', icon: '⭐', unlocked: false },
    { id: 'level_10', name: 'Veteran', description: 'Reach level 10', icon: '🌟', unlocked: false },
    { id: 'full_armor', name: 'Iron Fortress', description: 'Equip full iron armor', icon: '🛡️', unlocked: false },
    { id: 'first_farm', name: 'Green Thumb', description: 'Harvest your first crop', icon: '🌾', unlocked: false },
    { id: 'boss_kill', name: 'Giant Slayer', description: 'Defeat a castle boss', icon: '👑', unlocked: false },
    { id: 'explorer', name: 'Cartographer', description: 'Discover 5 structures', icon: '🗺️', unlocked: false },
    { id: 'enchant_first', name: 'Enchanter', description: 'Enchant a weapon', icon: '✨', unlocked: false },
    { id: 'recruit_warrior', name: 'Commander', description: 'Recruit a warrior', icon: '🎖️', unlocked: false },
  ];

  private unlockCallback: ((achievement: Achievement) => void) | null = null;
  private toastCallback: ((text: string) => void) | null = null;
  private structureCount = 0;

  /** Stats tracked for death screen. */
  readonly stats = { blocksMined: 0, enemiesKilled: 0, timePlayed: 0, distanceTraveled: 0 };

  constructor() {
    this.wireEvents();
  }

  onUnlock(cb: (achievement: Achievement) => void): void {
    this.unlockCallback = cb;
  }

  /** Set a toast callback (displayed via HUD). */
  setToastCallback(cb: (text: string) => void): void { this.toastCallback = cb; }

  /** Called every frame to track play time and movement distance. */
  updateFrame(dt: number, dx: number, dz: number): void {
    this.stats.timePlayed += dt;
    this.stats.distanceTraveled += Math.sqrt(dx * dx + dz * dz);
  }

  private wireEvents(): void {
    eventBus.on(Events.BLOCK_DESTROYED, (data: any) => {
      this.unlock('first_mine');
      this.stats.blocksMined++;
      if (data.blockType === 34) this.unlock('diamond_found');
    });
    eventBus.on(Events.ENTITY_DIED, (data: any) => {
      if (data.killedBy === 'player') {
        this.unlock('first_kill');
        this.stats.enemiesKilled++;
        if (data.warriorType === 'castle_boss') this.unlock('boss_kill');
      }
    });
    eventBus.on(Events.STRUCTURE_DISCOVERED, (data: any) => {
      this.structureCount++;
      if (data?.type === 'village') this.unlock('village_found');
      if (this.structureCount >= 5) this.unlock('explorer');
    });
    eventBus.on('wave:cleared', (data: any) => {
      if (data?.wave >= 5) this.unlock('wave_5');
      if (data?.wave >= 10) this.unlock('wave_10');
    });
    eventBus.on('player:level_up', (data: any) => {
      if (data?.level >= 5) this.unlock('level_5');
      if (data?.level >= 10) this.unlock('level_10');
    });
    eventBus.on('trade:complete', () => this.unlock('first_trade'));
    eventBus.on('crop:harvested', () => this.unlock('first_farm'));
    eventBus.on('enchant:applied', () => this.unlock('enchant_first'));
    eventBus.on('warrior:recruited', () => this.unlock('recruit_warrior'));
  }

  unlock(id: string): void {
    const ach = this.achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      if (this.unlockCallback) this.unlockCallback(ach);
      if (this.toastCallback) this.toastCallback(`🏆 ${ach.icon} ${ach.name}: ${ach.description}`);
    }
  }

  onCraft(itemId: string): void {
    this.unlock('first_craft');
    if (itemId.includes('iron_')) this.unlock('iron_age');
  }

  onCastleBuild(): void { this.unlock('first_castle'); }

  getAll(): Achievement[] { return [...this.achievements]; }
  getUnlocked(): Achievement[] { return this.achievements.filter(a => a.unlocked); }
  get unlockedCount(): number { return this.achievements.filter(a => a.unlocked).length; }
  get totalCount(): number { return this.achievements.length; }
}
