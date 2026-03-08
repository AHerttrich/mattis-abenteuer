import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../utils/EventBus';

describe('EventBus', () => {
  let bus: EventBus;
  beforeEach(() => { bus = new EventBus(); });

  it('should emit and receive events', () => {
    let received = false;
    bus.on('test', () => { received = true; });
    bus.emit('test');
    expect(received).toBe(true);
  });

  it('should pass data to listeners', () => {
    let data: unknown = null;
    bus.on('test', (d) => { data = d; });
    bus.emit('test', { value: 42 });
    expect(data).toEqual({ value: 42 });
  });

  it('should support unsubscribe', () => {
    let count = 0;
    const unsub = bus.on('test', () => { count++; });
    bus.emit('test');
    unsub();
    bus.emit('test');
    expect(count).toBe(1);
  });

  it('should support once()', () => {
    let count = 0;
    bus.once('test', () => { count++; });
    bus.emit('test');
    bus.emit('test');
    expect(count).toBe(1);
  });

  it('should clear listeners', () => {
    bus.on('a', () => {});
    bus.on('b', () => {});
    bus.clear('a');
    expect(bus.listenerCount('a')).toBe(0);
    expect(bus.listenerCount('b')).toBe(1);
    bus.clear();
    expect(bus.listenerCount('b')).toBe(0);
  });
});
