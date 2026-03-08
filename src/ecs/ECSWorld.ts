/**
 * ECSWorld — Manages all entities and systems.
 *
 * Central hub of the Entity-Component-System architecture.
 * Entities are stored here, systems are updated here.
 */

import { Entity } from './Entity';
import type { System } from './System';

export class ECSWorld {
  private entities = new Map<string, Entity>();
  private systems: System[] = [];
  private entitiesToRemove: string[] = [];

  /**
   * Add an entity to the world.
   */
  addEntity(entity: Entity): Entity {
    this.entities.set(entity.id, entity);
    return entity;
  }

  /**
   * Mark an entity for removal (deferred to end of update).
   */
  removeEntity(id: string): void {
    this.entitiesToRemove.push(id);
  }

  /**
   * Immediately remove an entity.
   */
  removeEntityImmediate(id: string): void {
    this.entities.delete(id);
  }

  /**
   * Get an entity by ID.
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities.
   */
  getAllEntities(): Entity[] {
    return [...this.entities.values()];
  }

  /**
   * Query entities that have ALL specified component types.
   */
  query(...componentTypes: string[]): Entity[] {
    const results: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.hasComponents(...componentTypes)) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Query entities by tag.
   */
  queryByTag(tag: string): Entity[] {
    const results: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.tag === tag) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Get the first entity matching a tag.
   */
  findByTag(tag: string): Entity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.tag === tag) {
        return entity;
      }
    }
    return undefined;
  }

  /**
   * Register a system.
   */
  addSystem(system: System): void {
    system.setWorld(this);
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
    system.init();
  }

  /**
   * Remove a system by name.
   */
  removeSystem(name: string): void {
    const index = this.systems.findIndex((s) => s.name === name);
    if (index !== -1) {
      this.systems[index].destroy();
      this.systems.splice(index, 1);
    }
  }

  /**
   * Update all systems. Called once per frame.
   */
  update(dt: number): void {
    for (const system of this.systems) {
      if (!system.enabled) continue;

      const entities = this.query(...system.requiredComponents);
      system.update(dt, entities);
    }

    // Deferred entity removal
    for (const id of this.entitiesToRemove) {
      this.entities.delete(id);
    }
    this.entitiesToRemove = [];
  }

  /**
   * Get entity count.
   */
  get entityCount(): number {
    return this.entities.size;
  }

  /**
   * Get system count.
   */
  get systemCount(): number {
    return this.systems.length;
  }

  /**
   * Destroy all entities and systems.
   */
  destroy(): void {
    for (const system of this.systems) {
      system.destroy();
    }
    this.systems = [];
    this.entities.clear();
  }
}
