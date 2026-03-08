/**
 * TextureAtlas — Generates a procedural texture atlas for block faces.
 * Each block type gets a unique 16×16 pixel tile, all packed into one texture.
 */

import * as THREE from 'three';
import { BlockType, getBlockProperties } from '../world/BlockType';

const TILE_SIZE = 16;
const ATLAS_COLS = 8;
const ATLAS_ROWS = 8;

export class TextureAtlas {
  texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_COLS * TILE_SIZE;
    this.canvas.height = ATLAS_ROWS * TILE_SIZE;
    this.ctx = this.canvas.getContext('2d')!;

    this.generateAllTiles();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.needsUpdate = true;
  }

  /** Get UV coordinates for a block type (u0, v0, u1, v1). */
  getUVs(blockType: BlockType): { u0: number; v0: number; u1: number; v1: number } {
    const idx = blockType as number;
    const col = idx % ATLAS_COLS;
    const row = Math.floor(idx / ATLAS_COLS);
    const u0 = col / ATLAS_COLS;
    const v0 = 1 - (row + 1) / ATLAS_ROWS;
    const u1 = (col + 1) / ATLAS_COLS;
    const v1 = 1 - row / ATLAS_ROWS;
    return { u0, v0, u1, v1 };
  }

  private generateAllTiles(): void {
    // Generate a tile for each block type
    for (let i = 1; i < ATLAS_COLS * ATLAS_ROWS; i++) {
      const blockType = i as BlockType;
      const props = getBlockProperties(blockType);
      if (!props || props.name === 'Unknown') continue;
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);
      this.generateTile(col * TILE_SIZE, row * TILE_SIZE, props.color, props.name);
    }
  }

  private generateTile(x: number, y: number, color: number, name: string): void {
    const ctx = this.ctx;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    // Base color fill
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Add noise/texture pattern
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        const noise = (Math.random() - 0.5) * 25;
        const nr = Math.max(0, Math.min(255, r + noise));
        const ng = Math.max(0, Math.min(255, g + noise));
        const nb = Math.max(0, Math.min(255, b + noise));
        ctx.fillStyle = `rgb(${nr},${ng},${nb})`;
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }

    // Add detail based on block type
    if (name.includes('Grass')) {
      this.addGrassDetail(x, y, r, g, b);
    } else if (name.includes('Stone') || name.includes('Ore')) {
      this.addStoneDetail(x, y, r, g, b);
    } else if (name.includes('Wood') || name.includes('Plank')) {
      this.addWoodDetail(x, y, r, g, b);
    } else if (name.includes('Sand')) {
      this.addSandDetail(x, y, r, g, b);
    } else if (name.includes('Brick') || name.includes('Wall') || name.includes('Castle')) {
      this.addBrickDetail(x, y, r, g, b);
    }

    // Border darkening for depth
    ctx.fillStyle = `rgba(0,0,0,0.15)`;
    ctx.fillRect(x, y, TILE_SIZE, 1);
    ctx.fillRect(x, y, 1, TILE_SIZE);
    ctx.fillStyle = `rgba(255,255,255,0.08)`;
    ctx.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1);
    ctx.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE);
  }

  private addGrassDetail(x: number, y: number, _r: number, _g: number, _b: number): void {
    // Green blades on top
    this.ctx.fillStyle = 'rgba(30,120,30,0.4)';
    for (let i = 0; i < 6; i++) {
      const px = Math.floor(Math.random() * TILE_SIZE);
      this.ctx.fillRect(x + px, y, 1, 2 + Math.floor(Math.random() * 3));
    }
    // Dirt patches
    this.ctx.fillStyle = 'rgba(101,67,33,0.3)';
    for (let i = 0; i < 3; i++) {
      const px = Math.floor(Math.random() * (TILE_SIZE - 2));
      const py = TILE_SIZE - 3 + Math.floor(Math.random() * 3);
      this.ctx.fillRect(x + px, y + py, 2, 2);
    }
  }

  private addStoneDetail(x: number, y: number, r: number, g: number, b: number): void {
    // Cracks
    this.ctx.strokeStyle = `rgba(${r * 0.6},${g * 0.6},${b * 0.6},0.5)`;
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      const sx = Math.floor(Math.random() * TILE_SIZE);
      const sy = Math.floor(Math.random() * TILE_SIZE);
      this.ctx.beginPath();
      this.ctx.moveTo(x + sx, y + sy);
      this.ctx.lineTo(x + sx + (Math.random() - 0.5) * 6, y + sy + (Math.random() - 0.5) * 6);
      this.ctx.stroke();
    }
  }

  private addWoodDetail(x: number, y: number, r: number, g: number, b: number): void {
    // Horizontal grain lines
    this.ctx.strokeStyle = `rgba(${r * 0.7},${g * 0.7},${b * 0.7},0.4)`;
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const lineY = y + 3 + i * 3 + Math.floor(Math.random() * 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x, lineY);
      this.ctx.lineTo(x + TILE_SIZE, lineY + (Math.random() - 0.5) * 2);
      this.ctx.stroke();
    }
  }

  private addSandDetail(x: number, y: number, _r: number, _g: number, _b: number): void {
    // Speckles
    for (let i = 0; i < 8; i++) {
      const px = Math.floor(Math.random() * TILE_SIZE);
      const py = Math.floor(Math.random() * TILE_SIZE);
      this.ctx.fillStyle = `rgba(200,180,120,${0.3 + Math.random() * 0.3})`;
      this.ctx.fillRect(x + px, y + py, 1, 1);
    }
  }

  private addBrickDetail(x: number, y: number, r: number, g: number, b: number): void {
    // Brick lines
    this.ctx.strokeStyle = `rgba(${r * 0.5},${g * 0.5},${b * 0.5},0.5)`;
    this.ctx.lineWidth = 1;
    // Horizontal mortar
    for (let i = 1; i < 4; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + i * 4);
      this.ctx.lineTo(x + TILE_SIZE, y + i * 4);
      this.ctx.stroke();
    }
    // Vertical mortar (staggered)
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : TILE_SIZE / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x + offset + TILE_SIZE / 2, y + row * 4);
      this.ctx.lineTo(x + offset + TILE_SIZE / 2, y + (row + 1) * 4);
      this.ctx.stroke();
    }
  }

  /** WS15: Re-draw animated tiles (lava, water) with time-shifted patterns. */
  updateAnimatedTiles(time: number): void {
    // Lava tile
    const lavaIdx = BlockType.LAVA as number;
    const lavaCol = lavaIdx % ATLAS_COLS;
    const lavaRow = Math.floor(lavaIdx / ATLAS_COLS);
    const lx = lavaCol * TILE_SIZE;
    const ly = lavaRow * TILE_SIZE;
    this.drawLavaTile(lx, ly, time);

    this.texture.needsUpdate = true;
  }

  private drawLavaTile(x: number, y: number, time: number): void {
    const ctx = this.ctx;
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        // Flowing lava pattern using sin/cos waves
        const wx = px / TILE_SIZE;
        const wy = py / TILE_SIZE;
        const flow = Math.sin(wx * 6.28 + time * 2.0 + Math.sin(wy * 4.0 + time)) * 0.5 + 0.5;
        const heat = Math.cos(wy * 6.28 + time * 1.5 + Math.cos(wx * 3.0)) * 0.5 + 0.5;
        const r = Math.round(200 + flow * 55);
        const g = Math.round(40 + heat * 80 + flow * 40);
        const b = Math.round(heat * 20);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
  }
}
