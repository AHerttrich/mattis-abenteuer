/**
 * Minimap — Canvas-based top-down minimap overlay.
 * Shows player position, castles, and warriors.
 */

export interface MinimapEntity {
  x: number;
  z: number;
  color: string;
  size?: number;
}

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 160;
  private scale = 2; // 1 pixel = N world blocks
  private playerMarker = { x: 0, z: 0, rotation: 0 };
  private entities: MinimapEntity[] = [];
  private castles: { x: number; z: number; color: string; label: string }[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cssText = `position:fixed;top:10px;right:10px;width:${this.size}px;height:${this.size}px;border:2px solid rgba(255,255,255,0.3);border-radius:8px;z-index:120;pointer-events:none;background:rgba(0,0,0,0.5);`;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Set player position and yaw. */
  setPlayer(x: number, z: number, rotation: number): void {
    this.playerMarker = { x, z, rotation };
  }

  /** Set entities to render (warriors). */
  setEntities(entities: MinimapEntity[]): void {
    this.entities = entities;
  }

  /** Register a castle for permanent display. */
  addCastle(x: number, z: number, color: string, label: string): void {
    this.castles.push({ x, z, color, label });
  }

  /** Mark enemy castle as discovered (change visibility). */
  revealEnemyCastle(x: number, z: number): void {
    const existing = this.castles.find((c) => c.label === 'Enemy');
    if (!existing) {
      this.addCastle(x, z, '#e74c3c', 'Enemy');
    }
  }

  update(): void {
    const ctx = this.ctx;
    const half = this.size / 2;

    // Clear
    ctx.fillStyle = 'rgba(20, 25, 20, 0.95)';
    ctx.fillRect(0, 0, this.size, this.size);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < this.size; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, this.size);
      ctx.moveTo(0, i);
      ctx.lineTo(this.size, i);
      ctx.stroke();
    }

    // Castles
    for (const castle of this.castles) {
      const cx = half + (castle.x - this.playerMarker.x) / this.scale;
      const cz = half + (castle.z - this.playerMarker.z) / this.scale;
      if (cx < -10 || cx > this.size + 10 || cz < -10 || cz > this.size + 10) {
        // Off-screen — show arrow at edge
        const angle = Math.atan2(cz - half, cx - half);
        const edgeX = half + Math.cos(angle) * (half - 8);
        const edgeZ = half + Math.sin(angle) * (half - 8);
        ctx.fillStyle = castle.color;
        ctx.beginPath();
        ctx.arc(edgeX, edgeZ, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.fillText(castle.label, edgeX - 10, edgeZ - 6);
      } else {
        // On-screen
        ctx.fillStyle = castle.color;
        ctx.fillRect(cx - 5, cz - 5, 10, 10);
        ctx.strokeStyle = castle.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 7, cz - 7, 14, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(castle.label, cx, cz - 9);
      }
    }

    // Warriors / entities
    for (const e of this.entities) {
      const ex = half + (e.x - this.playerMarker.x) / this.scale;
      const ez = half + (e.z - this.playerMarker.z) / this.scale;
      if (ex < 0 || ex > this.size || ez < 0 || ez > this.size) continue;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(ex, ez, e.size ?? 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (center, with direction arrow)
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(-this.playerMarker.rotation);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Compass
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', half, 12);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, this.size, this.size);
  }

  destroy(): void {
    this.canvas.remove();
  }
}
