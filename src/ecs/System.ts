/**
 * System — Base class for ECS systems.
 *
 * Systems contain game logic. They process entities
 * that have specific component combinations.
 */

import type { Entity } from './Entity';
import type { ECSWorld } from './ECSWorld';

export abstract class System {
  /** Human-readable name for debugging */
  abstract readonly name: string;

  /** Component types this system requires on entities */
  abstract readonly requiredComponents: string[];

  /** Priority for update ordering (lower = earlier) */
  readonly priority: number = 0;

  /** Whether this system is currently enabled */
  enabled = true;

  /** Reference to the ECS world (set when registered) */
  protected world!: ECSWorld;

  /**
   * Set the world reference. Called by ECSWorld.addSystem().
   */
  setWorld(world: ECSWorld): void {
    this.world = world;
  }

  /**
   * Called once when the system is first registered.
   */
  init(): void {
    // Override in subclass if needed
  }

  /**
   * Called every frame with delta time and matching entities.
   */
  abstract update(dt: number, entities: Entity[]): void;

  /**
   * Called when the system is removed or the game shuts down.
   */
  destroy(): void {
    // Override in subclass if needed
  }
}
