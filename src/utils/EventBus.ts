/**
 * EventBus — Decoupled pub/sub communication between game systems.
 *
 * Usage:
 *   eventBus.on('block:destroyed', (data) => { ... });
 *   eventBus.emit('block:destroyed', { x: 1, y: 2, z: 3 });
 */

type EventCallback<T = unknown> = (data: T) => void;

interface EventSubscription {
  id: number;
  callback: EventCallback;
}

export class EventBus {
  private listeners = new Map<string, EventSubscription[]>();
  private nextId = 0;

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    const id = this.nextId++;
    const subscription: EventSubscription = {
      id,
      callback: callback as EventCallback,
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(subscription);

    return () => this.off(event, id);
  }

  /**
   * Subscribe to an event, but only fire once.
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    const unsubscribe = this.on<T>(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Emit an event with data.
   */
  emit<T = unknown>(event: string, data?: T): void {
    const subs = this.listeners.get(event);
    if (!subs) return;

    // Copy to avoid mutation during iteration
    for (const sub of [...subs]) {
      sub.callback(data);
    }
  }

  /**
   * Remove a specific subscription by ID.
   */
  private off(event: string, id: number): void {
    const subs = this.listeners.get(event);
    if (!subs) return;

    const index = subs.findIndex((s) => s.id === id);
    if (index !== -1) {
      subs.splice(index, 1);
    }

    if (subs.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Remove all listeners for an event, or all events.
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}

/** Global event bus singleton */
export const eventBus = new EventBus();
