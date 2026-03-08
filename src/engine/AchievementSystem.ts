/**
 * AchievementSystem — Track and display player achievements.
 * Provides goals and progression feedback.
 */

import { eventBus, Events } from '../utils';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: PlayerStats) => boolean;
  unlocked: boolean;
}

export interface PlayerStats {
  blocksMined: number;
  blocksPlaced: number;
  itemsCrafted: number;
  buildingsBuilt: number;
  enemiesKilled: number;
  distanceTraveled: number;
  timePlayed: number;
  castleDiscovered: boolean;
  gameWon: boolean;
}

const DEFAULT_STATS: PlayerStats = {
  blocksMined: 0,
  blocksPlaced: 0,
  itemsCrafted: 0,
  buildingsBuilt: 0,
  enemiesKilled: 0,
  distanceTraveled: 0,
  timePlayed: 0,
  castleDiscovered: false,
  gameWon: false,
};

function createAchievements(): Achievement[] {
  return [
    { id: 'first_mine', name: 'Getting Started', description: 'Mine your first block', icon: '⛏️',
      condition: (s) => s.blocksMined >= 1, unlocked: false },
    { id: 'miner', name: 'Miner', description: 'Mine 100 blocks', icon: '💎',
      condition: (s) => s.blocksMined >= 100, unlocked: false },
    { id: 'deep_miner', name: 'Deep Miner', description: 'Mine 1000 blocks', icon: '🏆',
      condition: (s) => s.blocksMined >= 1000, unlocked: false },
    { id: 'builder', name: 'Builder', description: 'Place 50 blocks', icon: '🧱',
      condition: (s) => s.blocksPlaced >= 50, unlocked: false },
    { id: 'architect', name: 'Architect', description: 'Place 500 blocks', icon: '🏗️',
      condition: (s) => s.blocksPlaced >= 500, unlocked: false },
    { id: 'first_craft', name: 'Craftsman', description: 'Craft your first item', icon: '⚒️',
      condition: (s) => s.itemsCrafted >= 1, unlocked: false },
    { id: 'master_crafter', name: 'Master Crafter', description: 'Craft 50 items', icon: '🔨',
      condition: (s) => s.itemsCrafted >= 50, unlocked: false },
    { id: 'first_building', name: 'Castle Builder', description: 'Build a castle building', icon: '🏰',
      condition: (s) => s.buildingsBuilt >= 1, unlocked: false },
    { id: 'fortress', name: 'Fortress', description: 'Build 5 castle buildings', icon: '🛡️',
      condition: (s) => s.buildingsBuilt >= 5, unlocked: false },
    { id: 'first_kill', name: 'Warrior', description: 'Defeat an enemy', icon: '⚔️',
      condition: (s) => s.enemiesKilled >= 1, unlocked: false },
    { id: 'commander', name: 'Commander', description: 'Defeat 25 enemies', icon: '🎖️',
      condition: (s) => s.enemiesKilled >= 25, unlocked: false },
    { id: 'explorer', name: 'Explorer', description: 'Travel 1000 blocks', icon: '🧭',
      condition: (s) => s.distanceTraveled >= 1000, unlocked: false },
    { id: 'discoverer', name: 'Discoverer', description: 'Find the enemy castle', icon: '🔍',
      condition: (s) => s.castleDiscovered, unlocked: false },
    { id: 'survivor', name: 'Survivor', description: 'Play for 10 minutes', icon: '⏰',
      condition: (s) => s.timePlayed >= 600, unlocked: false },
    { id: 'veteran', name: 'Veteran', description: 'Play for 30 minutes', icon: '🎮',
      condition: (s) => s.timePlayed >= 1800, unlocked: false },
    { id: 'victory', name: 'VICTORY!', description: 'Destroy the enemy castle', icon: '👑',
      condition: (s) => s.gameWon, unlocked: false },
  ];
}

export class AchievementSystem {
  achievements: Achievement[];
  stats: PlayerStats;
  private toastCallback: ((text: string) => void) | null = null;

  constructor() {
    this.achievements = createAchievements();
    this.stats = { ...DEFAULT_STATS };
    this.setupListeners();
  }

  private setupListeners(): void {
    eventBus.on(Events.BLOCK_DESTROYED, () => { this.stats.blocksMined++; this.check(); });
    eventBus.on(Events.BLOCK_PLACED, () => { this.stats.blocksPlaced++; this.check(); });
    eventBus.on(Events.ITEM_CRAFTED, () => { this.stats.itemsCrafted++; this.check(); });
    eventBus.on(Events.WARRIOR_KILLED, () => { this.stats.enemiesKilled++; this.check(); });
    eventBus.on(Events.ENEMY_CASTLE_DISCOVERED, () => { this.stats.castleDiscovered = true; this.check(); });
    eventBus.on(Events.VICTORY, () => { this.stats.gameWon = true; this.check(); });
  }

  /** Set callback for achievement toast notifications. */
  setToastCallback(cb: (text: string) => void): void {
    this.toastCallback = cb;
  }

  /** Update travel distance and time. Called each frame. */
  updateFrame(dt: number, dx: number, dz: number): void {
    this.stats.timePlayed += dt;
    this.stats.distanceTraveled += Math.sqrt(dx * dx + dz * dz);
  }

  /** Increment buildings built. */
  onBuildingBuilt(): void {
    this.stats.buildingsBuilt++;
    this.check();
  }

  /** Check all achievements and unlock new ones. */
  private check(): void {
    for (const a of this.achievements) {
      if (a.unlocked) continue;
      if (a.condition(this.stats)) {
        a.unlocked = true;
        this.toastCallback?.(`🏆 Achievement: ${a.icon} ${a.name}`);
      }
    }
  }

  /** Get unlocked count. */
  get unlockedCount(): number {
    return this.achievements.filter((a) => a.unlocked).length;
  }

  /** Serialize for save. */
  serialize(): { stats: PlayerStats; unlocked: string[] } {
    return {
      stats: { ...this.stats },
      unlocked: this.achievements.filter((a) => a.unlocked).map((a) => a.id),
    };
  }

  /** Deserialize from save. */
  deserialize(data: { stats: PlayerStats; unlocked: string[] }): void {
    this.stats = { ...data.stats };
    for (const id of data.unlocked) {
      const a = this.achievements.find((a) => a.id === id);
      if (a) a.unlocked = true;
    }
  }
}
