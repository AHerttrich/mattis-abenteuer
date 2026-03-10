/**
 * WaveManager — Escalating enemy raid system.
 *
 * Waves grow in difficulty over time. Each wave spawns enemies at the
 * enemy castle and marches them toward the player. After every wave is
 * cleared a short peace period follows, then a 60s warning before the
 * next wave. Clearing a wave grants loot rewards.
 */

import { eventBus, Events } from '../utils';
import { WarriorType } from '../ecs/Component';

// ── Wave composition table ──────────────────────────────────
interface WaveUnit {
  type: WarriorType;
  count: number;
}
function wave(n: number): WaveUnit[] {
  const units: WaveUnit[] = [];
  // Swordsmen in every wave, scaling up
  units.push({ type: WarriorType.SWORDSMAN, count: 2 + n });
  // Archers from wave 4
  if (n >= 4) units.push({ type: WarriorType.ARCHER, count: Math.floor(n / 2) });
  // Shield bearers from wave 5
  if (n >= 5) units.push({ type: WarriorType.SHIELD_BEARER, count: Math.floor(n / 3) });
  // Cavalry from wave 7
  if (n >= 7) units.push({ type: WarriorType.CAVALRY, count: Math.floor((n - 5) / 2) });
  // Catapults from wave 9
  if (n >= 9)
    units.push({
      type: WarriorType.CATAPULT_OPERATOR,
      count: Math.max(1, Math.floor((n - 8) / 2)),
    });
  // Boss every 10 waves
  if (n > 0 && n % 10 === 0) units.push({ type: WarriorType.CASTLE_BOSS, count: 1 });
  return units;
}

// ── Loot rewards ────────────────────────────────────────────
function waveRewards(n: number): { itemId: string; count: number }[] {
  const loot: { itemId: string; count: number }[] = [];
  loot.push({ itemId: 'iron_ingot', count: 4 + n * 2 });
  loot.push({ itemId: 'stone_brick', count: 10 + n * 3 });
  if (n >= 3) loot.push({ itemId: 'gold_ingot', count: Math.floor(n / 2) });
  if (n >= 5) loot.push({ itemId: 'string', count: 5 + n });
  if (n >= 8) loot.push({ itemId: 'crystal', count: Math.floor(n / 3) });
  if (n >= 10) loot.push({ itemId: 'diamond', count: 1 });
  return loot;
}

// ── Events ──────────────────────────────────────────────────
export const WaveEvents = {
  WAVE_WARNING: 'wave:warning',
  WAVE_START: 'wave:start',
  WAVE_CLEARED: 'wave:cleared',
} as const;

export interface WaveState {
  waveNumber: number;
  phase: 'peace' | 'warning' | 'active';
  timer: number; // seconds remaining in current phase
  enemiesAlive: number; // during active wave
  totalEnemies: number; // total spawned this wave
}

export class WaveManager {
  private waveNumber = 0;
  private phase: 'peace' | 'warning' | 'active' = 'peace';
  private timer: number;
  private enemiesAlive = 0;
  private totalEnemies = 0;
  private spawnQueue: WaveUnit[] = [];
  private spawnTimer = 0;

  // Config
  private peaceDuration = 90; // seconds of peace after clearing
  private warningDuration = 60; // seconds of warning before spawn
  private spawnInterval = 1.5; // seconds between unit group spawns

  // Callback to actually spawn warriors
  private spawnCallback: ((type: WarriorType, count: number) => void) | null = null;
  private rewardCallback: ((items: { itemId: string; count: number }[]) => void) | null = null;

  constructor() {
    this.timer = this.peaceDuration;
    // Track enemy deaths to know when wave is cleared
    eventBus.on(Events.ENTITY_DIED, () => {
      if (this.phase === 'active') {
        this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);
      }
    });
  }

  /** Set the callback that actually spawns warriors. */
  onSpawn(cb: (type: WarriorType, count: number) => void): void {
    this.spawnCallback = cb;
  }

  /** Set the callback for awarding loot. */
  onReward(cb: (items: { itemId: string; count: number }[]) => void): void {
    this.rewardCallback = cb;
  }

  /** Call every frame. */
  update(dt: number): void {
    this.timer -= dt;

    switch (this.phase) {
      case 'peace':
        if (this.timer <= 0) {
          this.phase = 'warning';
          this.timer = this.warningDuration;
          this.waveNumber++;
          eventBus.emit(WaveEvents.WAVE_WARNING, {
            wave: this.waveNumber,
            seconds: this.warningDuration,
          });
        }
        break;

      case 'warning':
        if (this.timer <= 0) {
          this.startWave();
        }
        break;

      case 'active':
        // Spawn from queue
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
          const unit = this.spawnQueue.shift()!;
          if (this.spawnCallback) this.spawnCallback(unit.type, unit.count);
          this.spawnTimer = this.spawnInterval;
        }

        // Check if wave is cleared
        if (this.spawnQueue.length === 0 && this.enemiesAlive <= 0) {
          this.clearWave();
        }
        break;
    }
  }

  private startWave(): void {
    this.phase = 'active';
    this.spawnQueue = wave(this.waveNumber);
    this.totalEnemies = this.spawnQueue.reduce((s, u) => s + u.count, 0);
    this.enemiesAlive = this.totalEnemies;
    this.spawnTimer = 0; // spawn first group immediately
    eventBus.emit(WaveEvents.WAVE_START, {
      wave: this.waveNumber,
      totalEnemies: this.totalEnemies,
    });
  }

  private clearWave(): void {
    this.phase = 'peace';
    this.timer = this.peaceDuration;
    const rewards = waveRewards(this.waveNumber);
    if (this.rewardCallback) this.rewardCallback(rewards);
    eventBus.emit(WaveEvents.WAVE_CLEARED, { wave: this.waveNumber, rewards });
  }

  /** Get current wave state for HUD display. */
  getState(): WaveState {
    return {
      waveNumber: this.waveNumber,
      phase: this.phase,
      timer: Math.max(0, Math.ceil(this.timer)),
      enemiesAlive: this.enemiesAlive,
      totalEnemies: this.totalEnemies,
    };
  }
}
