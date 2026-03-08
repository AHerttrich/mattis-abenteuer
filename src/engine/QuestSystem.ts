/**
 * QuestSystem — Dynamic quests with objectives, progress tracking, and rewards.
 */

import { eventBus, Events } from '../utils';

export enum QuestObjective {
  KILL = 'kill',
  MINE = 'mine',
  CRAFT = 'craft',
  TRADE = 'trade',
  EXPLORE = 'explore',
  SURVIVE_WAVES = 'survive_waves',
  HARVEST = 'harvest',
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  icon: string;
  objective: QuestObjective;
  target: string;          // e.g. 'skeleton', 'iron_ore', ...
  required: number;
  progress: number;
  rewards: { itemId: string; count: number }[];
  xpReward: number;
  completed: boolean;
}

const QUEST_TEMPLATES: Omit<Quest, 'id' | 'progress' | 'completed'>[] = [
  { name: 'Monster Hunter', description: 'Defeat 5 cave skeletons', icon: '💀', objective: QuestObjective.KILL, target: 'skeleton', required: 5, rewards: [{ itemId: 'iron_ingot', count: 5 }], xpReward: 50 },
  { name: 'Spider Slayer', description: 'Defeat 10 cave spiders', icon: '🕷️', objective: QuestObjective.KILL, target: 'spider', required: 10, rewards: [{ itemId: 'string', count: 20 }], xpReward: 60 },
  { name: 'Iron Miner', description: 'Mine 20 iron ore', icon: '⛏️', objective: QuestObjective.MINE, target: 'iron_ore', required: 20, rewards: [{ itemId: 'gold_ingot', count: 5 }], xpReward: 40 },
  { name: 'Diamond Seeker', description: 'Mine 3 diamonds', icon: '💎', objective: QuestObjective.MINE, target: 'diamond', required: 3, rewards: [{ itemId: 'crystal', count: 5 }], xpReward: 80 },
  { name: 'Master Smith', description: 'Craft 5 weapons', icon: '🗡️', objective: QuestObjective.CRAFT, target: 'weapon', required: 5, rewards: [{ itemId: 'diamond', count: 2 }], xpReward: 60 },
  { name: 'Trader', description: 'Complete 3 trades with villagers', icon: '🤝', objective: QuestObjective.TRADE, target: 'any', required: 3, rewards: [{ itemId: 'gold_ingot', count: 8 }], xpReward: 40 },
  { name: 'Explorer', description: 'Discover 3 structures', icon: '🗺️', objective: QuestObjective.EXPLORE, target: 'any', required: 3, rewards: [{ itemId: 'crystal', count: 3 }], xpReward: 50 },
  { name: 'Wave Survivor', description: 'Survive 5 enemy waves', icon: '⚔️', objective: QuestObjective.SURVIVE_WAVES, target: 'any', required: 5, rewards: [{ itemId: 'diamond', count: 3 }], xpReward: 100 },
  { name: 'Farmer', description: 'Harvest 10 crops', icon: '🌾', objective: QuestObjective.HARVEST, target: 'any', required: 10, rewards: [{ itemId: 'golden_apple', count: 3 }], xpReward: 40 },
  { name: 'Gold Rush', description: 'Mine 10 gold ore', icon: '🟡', objective: QuestObjective.MINE, target: 'gold_ore', required: 10, rewards: [{ itemId: 'diamond', count: 1 }], xpReward: 50 },
];

export class QuestSystem {
  private activeQuests: Quest[] = [];
  private completedIds = new Set<string>();
  private questCounter = 0;
  private maxActive = 3;
  private completeCallback: ((quest: Quest) => void) | null = null;

  constructor() {
    this.generateQuests();
    this.wireEvents();
  }

  onComplete(cb: (quest: Quest) => void): void {
    this.completeCallback = cb;
  }

  private generateQuests(): void {
    while (this.activeQuests.length < this.maxActive) {
      const available = QUEST_TEMPLATES.filter(t => !this.completedIds.has(t.name) && !this.activeQuests.some(q => q.name === t.name));
      if (available.length === 0) break;
      const template = available[Math.floor(Math.random() * available.length)];
      this.activeQuests.push({
        ...template,
        id: `quest_${this.questCounter++}`,
        progress: 0,
        completed: false,
      });
    }
  }

  private wireEvents(): void {
    eventBus.on(Events.ENTITY_DIED, (data: any) => {
      this.advanceObjective(QuestObjective.KILL, data.warriorType ?? data.mobType ?? 'unknown');
    });
    eventBus.on(Events.BLOCK_DESTROYED, (data: any) => {
      const oreNames: Record<number, string> = { 30: 'coal', 31: 'iron_ore', 32: 'gold_ore', 33: 'crystal', 34: 'diamond' };
      const name = oreNames[data.blockType];
      if (name) this.advanceObjective(QuestObjective.MINE, name);
    });
    eventBus.on(Events.STRUCTURE_DISCOVERED, () => {
      this.advanceObjective(QuestObjective.EXPLORE, 'any');
    });
    eventBus.on('wave:cleared', () => {
      this.advanceObjective(QuestObjective.SURVIVE_WAVES, 'any');
    });
    eventBus.on('trade:complete', () => {
      this.advanceObjective(QuestObjective.TRADE, 'any');
    });
    eventBus.on('crop:harvested', () => {
      this.advanceObjective(QuestObjective.HARVEST, 'any');
    });
  }

  /** Advance progress on matching quests. */
  private advanceObjective(type: QuestObjective, target: string): void {
    for (const quest of this.activeQuests) {
      if (quest.completed) continue;
      if (quest.objective !== type) continue;
      if (quest.target !== 'any' && quest.target !== target) continue;

      quest.progress = Math.min(quest.progress + 1, quest.required);
      if (quest.progress >= quest.required) {
        quest.completed = true;
        this.completedIds.add(quest.name);
        if (this.completeCallback) this.completeCallback(quest);
        eventBus.emit('quest:complete', { quest });
      }
    }
  }

  /** Craft-related quest advance. */
  advanceCraft(isWeapon: boolean): void {
    this.advanceObjective(QuestObjective.CRAFT, isWeapon ? 'weapon' : 'item');
  }

  /** Remove completed quests and generate new ones. */
  refresh(): void {
    this.activeQuests = this.activeQuests.filter(q => !q.completed);
    this.generateQuests();
  }

  getActiveQuests(): Quest[] { return [...this.activeQuests]; }
  get completedCount(): number { return this.completedIds.size; }
}
