/**
 * GameManager — Orchestrates win/loss conditions and castle warfare flow.
 */

import { eventBus, Events, CASTLE_DETECTION_RADIUS } from '../utils';
import type { Castle } from '../castle/Castle';
import type { WarriorManager } from '../entities/WarriorManager';
import { WarriorType } from '../ecs/Component';
import type { HUD } from '../ui/HUD';

export enum GamePhase {
  EXPLORING = 'exploring',
  CASTLE_DISCOVERED = 'castle_discovered',
  WARFARE = 'warfare',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
}

export class GameManager {
  private playerCastle: Castle | null = null;
  private enemyCastle: Castle | null = null;
  private warriorManager: WarriorManager;
  private hud: HUD;
  private phase: GamePhase = GamePhase.EXPLORING;
  private gameTime = 0;
  private enemyCastleDiscovered = false;
  private bossSpawned = false;

  constructor(warriorManager: WarriorManager, hud: HUD) {
    this.warriorManager = warriorManager;
    this.hud = hud;

    eventBus.on(Events.CASTLE_DESTROYED, (data: unknown) => {
      const { owner } = data as { owner: string };
      if (owner === 'enemy') {
        this.phase = GamePhase.VICTORY;
        this.showVictory();
      } else if (owner === 'player') {
        this.phase = GamePhase.DEFEAT;
        this.showDefeat();
      }
    });

    eventBus.on(Events.BLOCK_DESTROYED, (data: any) => {
      if (!this.bossSpawned && this.enemyCastle && this.enemyCastle.throne) {
        const { x, z } = data;
        if (x !== undefined && z !== undefined) {
          const tx = this.enemyCastle.throne.x;
          const tz = this.enemyCastle.throne.z;
          const dist = Math.sqrt(Math.pow(x - tx, 2) + Math.pow(z - tz, 2));
          // Throne room base is 7x7 (dist up to ~4-5 for walls/door).
          if (dist <= 6) {
            this.bossSpawned = true;
            this.hud.showInfo('⚠️ THE CASTLE BOSS HAS AWAKENED! ⚠️', 5000);
            this.warriorManager.spawnWarrior(
              WarriorType.CASTLE_BOSS,
              'enemy',
              tx,
              this.enemyCastle.throne.y + 1,
              tz,
              this.enemyCastle.id,
              this.playerCastle?.id ?? '',
            );
          }
        }
      }
    });
  }

  setPlayerCastle(castle: Castle): void {
    this.playerCastle = castle;
  }
  setEnemyCastle(castle: Castle): void {
    this.enemyCastle = castle;
  }

  update(dt: number, playerX: number, playerZ: number): void {
    if (this.phase === GamePhase.VICTORY || this.phase === GamePhase.DEFEAT) return;

    this.gameTime += dt;

    // Check if player discovered enemy castle
    if (!this.enemyCastleDiscovered && this.enemyCastle) {
      const dx = playerX - this.enemyCastle.x;
      const dz = playerZ - this.enemyCastle.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < CASTLE_DETECTION_RADIUS) {
        this.enemyCastleDiscovered = true;
        this.phase = GamePhase.CASTLE_DISCOVERED;
        this.hud.showInfo('⚔️ Enemy Castle Discovered! Prepare for war!', 5000);
        eventBus.emit(Events.ENEMY_CASTLE_DISCOVERED, {
          x: this.enemyCastle.x,
          z: this.enemyCastle.z,
        });
        setTimeout(() => {
          this.phase = GamePhase.WARFARE;
        }, 5000);
      }
    }

    // Spawn warriors from castles
    if (this.playerCastle) {
      const spawns = this.playerCastle.update(this.gameTime);
      for (const spawn of spawns) {
        this.warriorManager.spawnWarrior(
          spawn.warriorType,
          'player',
          spawn.x,
          spawn.y,
          spawn.z,
          this.playerCastle.id,
          this.enemyCastle?.id ?? '',
        );
      }
    }

    if (this.enemyCastle) {
      const spawns = this.enemyCastle.update(this.gameTime);
      for (const spawn of spawns) {
        this.warriorManager.spawnWarrior(
          spawn.warriorType,
          'enemy',
          spawn.x,
          spawn.y,
          spawn.z,
          this.enemyCastle.id,
          this.playerCastle?.id ?? '',
        );
      }
    }
  }

  private showVictory(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:fadeIn 1s;';
    overlay.innerHTML = `
      <h1 style="font-size:64px;color:#f1c40f;text-shadow:4px 4px 8px #000;">🏆 VICTORY! 🏆</h1>
      <p style="font-size:24px;color:#2ecc71;margin-top:20px;">The enemy castle has been destroyed!</p>
      <p style="font-size:18px;color:#bdc3c7;margin-top:10px;">Time: ${this.formatTime()}</p>
      <p style="font-size:16px;color:#7f8c8d;margin-top:40px;">Refresh to play again</p>
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
    `;
    document.body.appendChild(overlay);
    eventBus.emit(Events.VICTORY, { time: this.gameTime });
  }

  private showDefeat(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:fadeIn 1s;';
    overlay.innerHTML = `
      <h1 style="font-size:64px;color:#e74c3c;text-shadow:4px 4px 8px #000;">💀 DEFEAT 💀</h1>
      <p style="font-size:24px;color:#e74c3c;margin-top:20px;">Your castle has been destroyed!</p>
      <p style="font-size:18px;color:#bdc3c7;margin-top:10px;">Time: ${this.formatTime()}</p>
      <p style="font-size:16px;color:#7f8c8d;margin-top:40px;">Refresh to try again</p>
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
    `;
    document.body.appendChild(overlay);
    eventBus.emit(Events.DEFEAT, { time: this.gameTime });
  }

  private formatTime(): string {
    const mins = Math.floor(this.gameTime / 60);
    const secs = Math.floor(this.gameTime % 60);
    return `${mins}m ${secs}s`;
  }

  get currentPhase(): GamePhase {
    return this.phase;
  }
  get isEnemyCastleDiscovered(): boolean {
    return this.enemyCastleDiscovered;
  }
}
