/**
 * Entity — A game object composed of components.
 *
 * Entities are just IDs with a bag of components.
 * All logic lives in Systems.
 */

import type { Component } from './Component';

let nextEntityId = 0;

export class Entity {
  readonly id: string;
  readonly tag: string;
  private components = new Map<string, Component>();

  constructor(tag = 'entity') {
    this.id = `${tag}_${nextEntityId++}`;
    this.tag = tag;
  }

  /**
   * Add a component to this entity.
   */
  addComponent<T extends Component>(component: T): this {
    this.components.set(component.type, component);
    return this;
  }

  /**
   * Remove a component by type.
   */
  removeComponent(type: string): this {
    this.components.delete(type);
    return this;
  }

  /**
   * Get a component by type. Returns undefined if not present.
   */
  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  /**
   * Check if entity has a component type.
   */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Check if entity has ALL of the specified component types.
   */
  hasComponents(...types: string[]): boolean {
    return types.every((t) => this.components.has(t));
  }

  /**
   * Get all component types on this entity.
   */
  getComponentTypes(): string[] {
    return [...this.components.keys()];
  }
}

/**
 * Reset the entity ID counter (useful for tests).
 */
export function resetEntityIdCounter(): void {
  nextEntityId = 0;
}
