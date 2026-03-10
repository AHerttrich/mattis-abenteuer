/**
 * ChunkManager — Loads, unloads, and meshes chunks around the player.
 */

import * as THREE from 'three';
import { RENDER_DISTANCE, CHUNK_SIZE } from '../utils/constants';
import { eventBus, Events } from '../utils';
import { Chunk } from './Chunk';
import { WorldGenerator } from './WorldGenerator';
import { buildChunkMesh } from './ChunkMesher';
import type { TextureAtlas } from './TextureAtlas';

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private meshes = new Map<string, THREE.Mesh>();
  private scene: THREE.Scene;
  private generator: WorldGenerator;
  private atlas?: TextureAtlas;
  private lastPlayerChunkX = Infinity;
  private lastPlayerChunkZ = Infinity;

  constructor(scene: THREE.Scene, generator: WorldGenerator, atlas?: TextureAtlas) {
    this.scene = scene;
    this.generator = generator;
    this.atlas = atlas;
  }

  update(playerX: number, playerZ: number): void {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    if (pcx === this.lastPlayerChunkX && pcz === this.lastPlayerChunkZ) {
      this.rebuildDirtyChunks();
      return;
    }
    this.lastPlayerChunkX = pcx;
    this.lastPlayerChunkZ = pcz;

    // Load new chunks
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
        const cx = pcx + dx,
          cz = pcz + dz;
        const key = Chunk.makeKey(cx, cz);
        if (!this.chunks.has(key)) {
          const chunk = new Chunk(cx, cz);
          this.generator.generate(chunk);
          this.chunks.set(key, chunk);
          this.buildMesh(chunk);
          eventBus.emit(Events.CHUNK_LOADED, { cx, cz });
        }
      }
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      const dx = chunk.cx - pcx,
        dz = chunk.cz - pcz;
      if (dx * dx + dz * dz > (RENDER_DISTANCE + 2) * (RENDER_DISTANCE + 2)) {
        this.removeMesh(key);
        this.chunks.delete(key);
        eventBus.emit(Events.CHUNK_UNLOADED, { cx: chunk.cx, cz: chunk.cz });
      }
    }
  }

  private rebuildDirtyChunks(): void {
    for (const [key, chunk] of this.chunks) {
      if (chunk.dirty) this.buildMesh(chunk, key);
    }
  }

  private buildMesh(chunk: Chunk, existingKey?: string): void {
    const key = existingKey ?? chunk.key;
    this.removeMesh(key);
    const mesh = buildChunkMesh(chunk, this.chunks, this.atlas, this.generator);
    if (mesh) {
      this.scene.add(mesh);
      this.meshes.set(key, mesh);
    }
    chunk.dirty = false;
  }

  private removeMesh(key: string): void {
    const old = this.meshes.get(key);
    if (old) {
      this.scene.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
      this.meshes.delete(key);
    }
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(Chunk.makeKey(cx, cz));
  }

  getBlockAtWorld(wx: number, wy: number, wz: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE),
      cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(Chunk.makeKey(cx, cz));
    if (!chunk) return 0;
    return chunk.getBlock(
      ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
      wy,
      ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    );
  }

  setBlockAtWorld(wx: number, wy: number, wz: number, type: number): void {
    const cx = Math.floor(wx / CHUNK_SIZE),
      cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(Chunk.makeKey(cx, cz));
    if (!chunk) return;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(lx, wy, lz, type);
    // Mark neighbor chunks dirty if on edge
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1);
  }

  private markDirty(cx: number, cz: number): void {
    const c = this.chunks.get(Chunk.makeKey(cx, cz));
    if (c) c.dirty = true;
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  /** Get all active meshes (for uniform updates like wind). */
  get activeMeshes(): IterableIterator<THREE.Mesh> {
    return this.meshes.values();
  }

  /** Replace the world generator (for multiplayer seed sync). Clears all chunks. */
  replaceGenerator(generator: WorldGenerator): void {
    // Remove all existing meshes and chunks
    for (const [key] of this.meshes) this.removeMesh(key);
    this.chunks.clear();
    this.generator = generator;
    // Reset player chunk tracking to force reload
    this.lastPlayerChunkX = Infinity;
    this.lastPlayerChunkZ = Infinity;
  }

  destroy(): void {
    for (const [key] of this.meshes) this.removeMesh(key);
    this.chunks.clear();
  }
}
