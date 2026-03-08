import { describe, it, expect } from 'vitest';

describe('Mattis Abenteuer', () => {
  it('should have a working test runner', () => {
    expect(1 + 1).toBe(2);
  });

  it('should define game constants', () => {
    const GAME_NAME = 'Mattis Abenteuer';
    const BLOCK_SIZE = 1;
    const CHUNK_SIZE = 16;

    expect(GAME_NAME).toBe('Mattis Abenteuer');
    expect(BLOCK_SIZE).toBeGreaterThan(0);
    expect(CHUNK_SIZE).toBe(16);
  });
});
