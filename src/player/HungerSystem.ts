/**
 * HungerSystem — Manages player hunger, saturation, and food consumption.
 */

import { eventBus, Events } from '../utils';

export class HungerSystem {
  hunger = 20; // 0-20 (like Minecraft)
  saturation = 5; // Hidden buffer that depletes before hunger
  maxHunger = 20;
  private exhaustion = 0;
  private exhaustionThreshold = 4.0;

  /** Call every frame with delta time. */
  update(dt: number, isSprinting: boolean, isMining: boolean): void {
    // Exhaustion rates
    if (isSprinting) this.exhaustion += dt * 0.8;
    if (isMining) this.exhaustion += dt * 0.2;
    this.exhaustion += dt * 0.05; // passive

    // Deplete saturation first, then hunger
    if (this.exhaustion >= this.exhaustionThreshold) {
      this.exhaustion = 0;
      if (this.saturation > 0) {
        this.saturation = Math.max(0, this.saturation - 1);
      } else {
        this.hunger = Math.max(0, this.hunger - 1);
        if (this.hunger <= 0) {
          eventBus.emit(Events.PLAYER_STARVING, {});
        }
      }
    }
  }

  /** Eat food to restore hunger/saturation. Returns whether food was consumed. */
  eat(hungerRestore: number, saturationRestore: number): boolean {
    if (this.hunger >= this.maxHunger) return false;
    this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestore);
    this.saturation = Math.min(this.hunger, this.saturation + saturationRestore);
    return true;
  }

  /** Can the player sprint? (hunger > 4) */
  get canSprint(): boolean {
    return this.hunger > 4;
  }

  /** Can the player regenerate health? (hunger >= 14) */
  get canHeal(): boolean {
    return this.hunger >= 14;
  }

  /** Is the player starving? (hunger === 0) */
  get isStarving(): boolean {
    return this.hunger <= 0;
  }

  /** Get hunger percentage (0-1). */
  get percentage(): number {
    return this.hunger / this.maxHunger;
  }

  /** Serialize for save. */
  serialize(): { hunger: number; saturation: number } {
    return { hunger: this.hunger, saturation: this.saturation };
  }

  /** Deserialize from save. */
  deserialize(data: { hunger: number; saturation: number }): void {
    this.hunger = data.hunger;
    this.saturation = data.saturation;
  }
}
