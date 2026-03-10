/**
 * Inventory — Manages item stacks in slots.
 */

import { INVENTORY_SIZE, HOTBAR_SIZE, MAX_STACK_SIZE } from '../utils/constants';
import { getItemDef, type ItemStack } from './Item';

export class Inventory {
  readonly slots: (ItemStack | null)[];
  readonly size: number;
  selectedHotbarSlot = 0;

  constructor(size = INVENTORY_SIZE) {
    this.size = size;
    this.slots = new Array(size).fill(null);
  }

  /** Add items. Returns leftover count that didn't fit. */
  addItem(itemId: string, count = 1): number {
    const def = getItemDef(itemId);
    if (!def) return count;
    let remaining = count;
    const maxStack = Math.min(def.stackSize, MAX_STACK_SIZE);

    // First, try to stack with existing
    for (let i = 0; i < this.size && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId && slot.count < maxStack) {
        const add = Math.min(remaining, maxStack - slot.count);
        slot.count += add;
        remaining -= add;
      }
    }

    // Then fill empty slots
    for (let i = 0; i < this.size && remaining > 0; i++) {
      if (!this.slots[i]) {
        const add = Math.min(remaining, maxStack);
        this.slots[i] = { itemId, count: add };
        remaining -= add;
      }
    }
    return remaining;
  }

  /** Remove items. Returns true if enough were removed. */
  removeItem(itemId: string, count = 1): boolean {
    if (this.countItem(itemId) < count) return false;
    let remaining = count;
    for (let i = 0; i < this.size && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId) {
        const remove = Math.min(remaining, slot.count);
        slot.count -= remove;
        remaining -= remove;
        if (slot.count <= 0) this.slots[i] = null;
      }
    }
    return true;
  }

  /** Damage the item in a specific slot. Returns true if the item broke. */
  damageItem(slotIndex: number, amount = 1): boolean {
    const slot = this.slots[slotIndex];
    if (!slot) return false;

    // If it doesn't have initialized durability but the def says it should, initialize it
    if (slot.durability === undefined) {
      const def = getItemDef(slot.itemId);
      if (def && def.durability !== undefined) {
        slot.durability = def.durability;
      } else {
        return false; // Not a damageable item
      }
    }

    slot.durability -= amount;
    if (slot.durability <= 0) {
      this.slots[slotIndex] = null; // Item broke
      return true;
    }
    return false;
  }

  /** Count total of an item across all slots. */
  countItem(itemId: string): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.itemId === itemId) total += slot.count;
    }
    return total;
  }

  /** Check if inventory has at least `count` of an item. */
  hasItem(itemId: string, count = 1): boolean {
    return this.countItem(itemId) >= count;
  }

  /** Get the currently selected hotbar item. */
  getSelectedItem(): ItemStack | null {
    return this.slots[this.selectedHotbarSlot];
  }

  /** Select a hotbar slot (0-8). */
  selectHotbar(slot: number): void {
    this.selectedHotbarSlot = Math.max(0, Math.min(HOTBAR_SIZE - 1, slot));
  }

  /** Get hotbar slots. */
  getHotbar(): (ItemStack | null)[] {
    return this.slots.slice(0, HOTBAR_SIZE);
  }

  /** Swap two slots. */
  swapSlots(a: number, b: number): void {
    [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]];
  }

  /** Split a stack in half. The second half goes to `target` slot (must be empty). */
  splitStack(source: number, target: number): boolean {
    const stack = this.slots[source];
    if (!stack || stack.count < 2 || this.slots[target]) return false;
    const half = Math.floor(stack.count / 2);
    this.slots[target] = { itemId: stack.itemId, count: half, durability: undefined };
    stack.count -= half;
    return true;
  }

  /** Check if inventory is full. */
  get isFull(): boolean {
    return this.slots.every((s) => s !== null);
  }

  /** Count used slots. */
  get usedSlots(): number {
    return this.slots.filter((s) => s !== null).length;
  }

  /** Clear all slots. */
  clear(): void {
    this.slots.fill(null);
  }
}
