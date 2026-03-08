/**
 * BaseBuildView — Top-down strategic view for castle building.
 *
 * Renders an HTML Canvas overlay showing the castle layout as a grid.
 * Each building is a colored tile with its icon and a live HP bar.
 * The player selects a building type from a sidebar palette, then
 * clicks on the grid to place it.
 *
 * Controls: scroll = zoom, right-drag = pan, ESC = close, click = place
 */

import { Castle, BuildingType, BUILDING_FOOTPRINT } from '../castle/Castle';
import type { CastleBuilding } from '../castle/Castle';
import { BUILDING_OPTIONS } from './CastleBuildUI';
import type { BuildingOption } from './CastleBuildUI';
import type { Inventory } from '../crafting/Inventory';
import type { ChunkManager } from '../world/ChunkManager';
import type { HUD } from './HUD';

// ── Colours per building type ─────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  [BuildingType.BARRACKS]:       '#3498db',
  [BuildingType.ARCHERY_RANGE]:  '#2ecc71',
  [BuildingType.STABLE]:         '#9b59b6',
  [BuildingType.SIEGE_WORKSHOP]: '#e67e22',
  [BuildingType.WATCHTOWER]:     '#f1c40f',
  [BuildingType.WALL]:           '#95a5a6',
  [BuildingType.GATE]:           '#7f8c8d',
  [BuildingType.THRONE_ROOM]:    '#ffd700',
};

const TYPE_ICONS: Record<string, string> = {
  [BuildingType.BARRACKS]:       '⚔️',
  [BuildingType.ARCHERY_RANGE]:  '🏹',
  [BuildingType.STABLE]:         '🐴',
  [BuildingType.SIEGE_WORKSHOP]: '💣',
  [BuildingType.WATCHTOWER]:     '🗼',
  [BuildingType.WALL]:           '🧱',
  [BuildingType.GATE]:           '🚪',
  [BuildingType.THRONE_ROOM]:    '👑',
};

export class BaseBuildView {
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private palette: HTMLDivElement;
  private castle: Castle;
  private inventory: Inventory;
  private hud: HUD;

  private _visible = false;
  private selected: BuildingOption | null = null;

  // View transform
  private viewX = 0;
  private viewZ = 0;
  private cellSize = 14;
  private minCellSize = 4;
  private maxCellSize = 32;

  // Interaction
  private hoverGridX = -1;
  private hoverGridZ = -1;
  private isPanning = false;
  private panStartX = 0;
  private panStartZ = 0;
  private panMouseX = 0;
  private panMouseZ = 0;

  // Rearrange mode
  private rearrangeTarget: CastleBuilding | null = null;

  // Tooltip
  private tooltip: HTMLDivElement;

  // Bound handlers
  private _onWheel: (e: WheelEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onClick: (e: MouseEvent) => void;
  private _onRightClick: (e: MouseEvent) => void;
  private _onKey: (e: KeyboardEvent) => void;

  // Build callback
  private buildCallback: ((type: BuildingType, wx: number, wy: number, wz: number) => void) | null = null;

  constructor(castle: Castle, inventory: Inventory, _chunkManager: ChunkManager, hud: HUD) {
    this.castle = castle;
    this.inventory = inventory;
    this.hud = hud;

    // Center on castle
    this.viewX = castle.x;
    this.viewZ = castle.z;

    // ── Overlay container ──────────────────────────────────────
    this.overlay = document.createElement('div');
    this.overlay.id = 'base-build-view';
    this.overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:180;display:none;background:rgba(10,15,25,0.92);font-family:monospace;color:#fff;';

    // ── Title bar ──────────────────────────────────────────────
    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:40px;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:16px;letter-spacing:2px;z-index:2;gap:12px;';
    titleBar.innerHTML = '🏰 <span style="color:#f1c40f;margin:0 8px;">BASE BUILDING</span> 🏰 &nbsp;<span style="color:#7f8c8d;font-size:11px;">Scroll=Zoom &nbsp;RightDrag=Pan &nbsp;Click=Place &nbsp;RightClick=Demolish &nbsp;ESC=Close</span>';
    // Fit All button
    const fitBtn = document.createElement('button');
    fitBtn.style.cssText = 'background:#2040c0;color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;font-family:monospace;';
    fitBtn.textContent = '⊞ Fit All';
    fitBtn.addEventListener('click', () => this.fitAllZoom());
    titleBar.appendChild(fitBtn);

    // ── Tooltip ────────────────────────────────────────────────
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = 'position:fixed;pointer-events:none;z-index:500;display:none;background:rgba(15,15,30,0.95);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:8px 12px;font-size:11px;color:#ddd;box-shadow:0 4px 16px rgba(0,0,0,0.6);max-width:200px;font-family:monospace;';
    document.body.appendChild(this.tooltip);
    this.overlay.appendChild(titleBar);

    // ── Palette sidebar ────────────────────────────────────────
    this.palette = document.createElement('div');
    this.palette.style.cssText = 'position:absolute;top:50px;left:12px;width:160px;bottom:12px;overflow-y:auto;z-index:2;display:flex;flex-direction:column;gap:6px;';
    this.buildPalette();
    this.overlay.appendChild(this.palette);

    // ── Canvas ─────────────────────────────────────────────────
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;top:50px;left:184px;right:12px;bottom:12px;border-radius:8px;cursor:crosshair;';
    this.overlay.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    document.body.appendChild(this.overlay);

    // ── Event handlers ─────────────────────────────────────────
    this._onWheel = (e) => { if (!this._visible) return; e.preventDefault(); this.cellSize = Math.max(this.minCellSize, Math.min(this.maxCellSize, this.cellSize + (e.deltaY > 0 ? -1 : 1))); this.render(); };
    this._onMouseMove = (e) => this.handleMouseMove(e);
    this._onMouseDown = (e) => { if (!this._visible || e.button !== 2) return; this.isPanning = true; this.panMouseX = e.clientX; this.panMouseZ = e.clientY; this.panStartX = this.viewX; this.panStartZ = this.viewZ; };
    this._onMouseUp = () => { this.isPanning = false; };
    this._onClick = (e) => this.handleClick(e);
    this._onRightClick = (e) => this.handleRightClick(e);
    this._onKey = (e) => { if (this._visible && e.key === 'Escape') { if (this.rearrangeTarget) { this.rearrangeTarget = null; this.hud.showInfo('Rearrange cancelled'); this.render(); } else { this.close(); } } };

    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('contextmenu', this._onRightClick);
    window.addEventListener('keydown', this._onKey);
  }

  // ── Palette ────────────────────────────────────────────────
  private buildPalette(): void {
    this.palette.innerHTML = '';
    for (const opt of BUILDING_OPTIONS) {
      const canAfford = this.checkCost(opt.cost);
      const btn = document.createElement('div');
      btn.style.cssText = `background:${canAfford ? 'rgba(30,40,60,0.9)' : 'rgba(30,30,30,0.6)'};border:2px solid ${canAfford ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'};border-radius:6px;padding:8px;cursor:${canAfford ? 'pointer' : 'not-allowed'};opacity:${canAfford ? '1' : '0.4'};transition:all 0.15s;`;

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;';
      header.innerHTML = `<span style="font-size:18px;">${opt.icon}</span><span style="font-weight:bold;">${opt.label}</span>`;
      btn.appendChild(header);

      const costDiv = document.createElement('div');
      costDiv.style.cssText = 'font-size:10px;color:#7f8c8d;margin-top:4px;line-height:1.4;';
      costDiv.textContent = opt.cost.map(c => `${c.count}× ${c.itemId.replace(/_/g, ' ')}`).join(', ');
      btn.appendChild(costDiv);

      // HP info
      const hpLabel = document.createElement('div');
      hpLabel.style.cssText = 'font-size:9px;color:#555;margin-top:2px;';
      const hp = this.getBuildingHP(opt.type);
      hpLabel.textContent = `HP: ${hp}`;
      btn.appendChild(hpLabel);

      if (canAfford) {
        btn.addEventListener('click', () => this.selectBuilding(opt));
        btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#f1c40f'; });
        btn.addEventListener('mouseleave', () => { btn.style.borderColor = this.selected === opt ? '#2ecc71' : 'rgba(255,255,255,0.2)'; });
      }

      btn.dataset.type = opt.type;
      this.palette.appendChild(btn);
    }
  }

  private getBuildingHP(type: BuildingType): number {
    const hpMap: Record<string, number> = {
      [BuildingType.BARRACKS]: 200, [BuildingType.ARCHERY_RANGE]: 180,
      [BuildingType.STABLE]: 220, [BuildingType.SIEGE_WORKSHOP]: 250,
      [BuildingType.WATCHTOWER]: 150, [BuildingType.WALL]: 300,
      [BuildingType.GATE]: 400, [BuildingType.THRONE_ROOM]: 500,
    };
    return hpMap[type] ?? 200;
  }

  private selectBuilding(opt: BuildingOption): void {
    this.selected = opt;
    this.hud.showInfo(`🏗️ ${opt.label} selected — click grid to place`);
    // Highlight selected in palette
    this.palette.querySelectorAll('div[data-type]').forEach(el => {
      (el as HTMLElement).style.borderColor = el.getAttribute('data-type') === opt.type ? '#2ecc71' : 'rgba(255,255,255,0.2)';
    });
    this.render();
  }

  // ── Open / Close ───────────────────────────────────────────
  open(): void {
    this._visible = true;
    this.overlay.style.display = 'block';
    this.viewX = this.castle.x;
    this.viewZ = this.castle.z;
    this.selected = null;
    this.rearrangeTarget = null;
    this.resizeCanvas();
    this.buildPalette();
    this.fitAllZoom();
    this.render();
    document.exitPointerLock();
  }

  close(): void {
    this._visible = false;
    this.overlay.style.display = 'none';
    this.selected = null;
    this.rearrangeTarget = null;
    this.tooltip.style.display = 'none';
    const canvas = document.querySelector('canvas:not(#base-build-view canvas)') as HTMLCanvasElement | null;
    if (canvas) canvas.requestPointerLock();
  }

  get isVisible(): boolean { return this._visible; }

  /** Auto-zoom to fit all buildings with padding. */
  private fitAllZoom(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const bounds = this.castle.getBounds();
    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxZ - bounds.minZ;
    if (worldW <= 0 || worldH <= 0) return;
    // Center camera
    this.viewX = (bounds.minX + bounds.maxX) / 2;
    this.viewZ = (bounds.minZ + bounds.maxZ) / 2;
    // Calculate cell size to fit all + 20% padding
    const cellW = (rect.width * 0.8) / worldW;
    const cellH = (rect.height * 0.8) / worldH;
    this.cellSize = Math.max(this.minCellSize, Math.min(this.maxCellSize, Math.floor(Math.min(cellW, cellH))));
    this.render();
  }

  /** Set a callback for when a building is placed (to create 3D blocks). */
  onBuild(cb: (type: BuildingType, wx: number, wy: number, wz: number) => void): void {
    this.buildCallback = cb;
  }

  // ── Rendering ──────────────────────────────────────────────
  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  render(): void {
    if (!this._visible) return;
    const W = this.canvas.width / devicePixelRatio;
    const H = this.canvas.height / devicePixelRatio;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);

    const cs = this.cellSize;
    const bounds = this.castle.getBounds();

    // ── Grid ──────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let wx = bounds.minX; wx <= bounds.maxX; wx++) {
      const sx = this.worldToScreenX(wx, W);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
    }
    for (let wz = bounds.minZ; wz <= bounds.maxZ; wz++) {
      const sy = this.worldToScreenZ(wz, H);
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    }

    // ── Castle area highlight ─────────────────────────────
    const aMinX = this.worldToScreenX(bounds.minX + 15, W);
    const aMaxX = this.worldToScreenX(bounds.maxX - 15, W);
    const aMinZ = this.worldToScreenZ(bounds.minZ + 15, H);
    const aMaxZ = this.worldToScreenZ(bounds.maxZ - 15, H);
    ctx.fillStyle = 'rgba(255,215,0,0.04)';
    ctx.fillRect(aMinX, aMinZ, aMaxX - aMinX, aMaxZ - aMinZ);

    // ── Buildings ─────────────────────────────────────────
    for (const bld of this.castle.buildings) {
      this.drawBuilding(ctx, bld, W, H);
    }

    // ── Hover preview ────────────────────────────────────
    if (this.selected && this.hoverGridX !== -1) {
      const fp = BUILDING_FOOTPRINT[this.selected.type] ?? 5;
      const half = Math.floor(fp / 2);
      const sx = this.worldToScreenX(this.hoverGridX - half, W);
      const sy = this.worldToScreenZ(this.hoverGridZ - half, H);
      const pw = fp * cs;
      const ph = fp * cs;

      // Check if position is valid
      const existing = this.castle.getBuildingAt(this.hoverGridX, this.hoverGridZ);
      const canAfford = this.selected ? this.checkCost(this.selected.cost) : false;
      const valid = !existing && canAfford;

      ctx.fillStyle = valid ? 'rgba(46,204,113,0.25)' : 'rgba(231,76,60,0.25)';
      ctx.fillRect(sx, sy, pw, ph);
      ctx.strokeStyle = valid ? '#2ecc71' : '#e74c3c';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, pw, ph);

      // Preview icon
      ctx.font = `${Math.max(14, cs * 1.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TYPE_ICONS[this.selected.type] ?? '?', sx + pw / 2, sy + ph / 2);
    }

    // Rearrange preview
    if (this.rearrangeTarget && this.hoverGridX !== -1) {
      const fp = BUILDING_FOOTPRINT[this.rearrangeTarget.type] ?? 5;
      const half = Math.floor(fp / 2);
      const sx = this.worldToScreenX(this.hoverGridX - half, W);
      const sy = this.worldToScreenZ(this.hoverGridZ - half, H);
      const pw = fp * cs;
      const ph = fp * cs;
      ctx.fillStyle = 'rgba(241,196,15,0.2)';
      ctx.fillRect(sx, sy, pw, ph);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, pw, ph);
      ctx.setLineDash([]);
    }

    // Compass
    this.drawCompass(ctx, W, H);
  }

  private drawBuilding(ctx: CanvasRenderingContext2D, bld: CastleBuilding, W: number, H: number): void {
    const cs = this.cellSize;
    const fp = BUILDING_FOOTPRINT[bld.type] ?? 5;
    const half = Math.floor(fp / 2);
    const sx = this.worldToScreenX(bld.x - half, W);
    const sy = this.worldToScreenZ(bld.z - half, H);
    const pw = fp * cs;
    const ph = fp * cs;
    const isRearranging = this.rearrangeTarget === bld;

    // Background
    const hpRatio = bld.hp / bld.maxHp;
    const baseColor = TYPE_COLORS[bld.type] ?? '#888';
    ctx.fillStyle = bld.hp <= 0 ? 'rgba(50,50,50,0.5)' : baseColor;
    ctx.globalAlpha = bld.hp <= 0 ? 0.3 : isRearranging ? 0.4 : 0.75;
    ctx.fillRect(sx + 1, sy + 1, pw - 2, ph - 2);
    ctx.globalAlpha = 1;

    // Border (pulsing if being rearranged)
    ctx.strokeStyle = isRearranging ? '#f1c40f' : (bld.hp <= 0 ? '#333' : baseColor);
    ctx.lineWidth = isRearranging ? 3 : (bld.type === BuildingType.THRONE_ROOM ? 3 : 1.5);
    if (isRearranging) ctx.setLineDash([4, 4]);
    ctx.strokeRect(sx + 1, sy + 1, pw - 2, ph - 2);
    ctx.setLineDash([]);

    // Cracks if damaged
    if (hpRatio < 0.5 && bld.hp > 0) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + pw * 0.3, sy + 2);
      ctx.lineTo(sx + pw * 0.5, sy + ph * 0.4);
      ctx.lineTo(sx + pw * 0.4, sy + ph * 0.7);
      ctx.stroke();
    }

    // Icon
    if (pw >= 10) {
      const fontSize = Math.max(8, Math.min(24, fp * cs * 0.4));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TYPE_ICONS[bld.type] ?? '?', sx + pw / 2, sy + ph / 2 - (pw > 20 ? 6 : 0));
    }

    // Label
    if (pw >= 30) {
      ctx.font = `${Math.max(7, cs * 0.5)}px monospace`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(bld.type.toUpperCase(), sx + pw / 2, sy + ph / 2 + (fp > 3 ? 10 : 5));
    }

    // HP bar
    if (bld.hp > 0 && pw >= 10) {
      const barW = pw - 4;
      const barH = Math.max(2, cs * 0.2);
      const barX = sx + 2;
      const barY = sy + ph - barH - 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      const hpColor = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f1c40f' : '#e74c3c';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }

    // Destroyed X
    if (bld.hp <= 0) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + 4); ctx.lineTo(sx + pw - 4, sy + ph - 4);
      ctx.moveTo(sx + pw - 4, sy + 4); ctx.lineTo(sx + 4, sy + ph - 4);
      ctx.stroke();
    }
  }

  /** Draw compass labels at edges. */
  private drawCompass(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', W / 2, 12);
    ctx.fillText('S', W / 2, H - 8);
    ctx.fillText('W', 12, H / 2);
    ctx.fillText('E', W - 12, H / 2);
  }

  // ── Coordinate transforms ──────────────────────────────
  private worldToScreenX(wx: number, screenW: number): number {
    return screenW / 2 + (wx - this.viewX) * this.cellSize;
  }
  private worldToScreenZ(wz: number, screenH: number): number {
    return screenH / 2 + (wz - this.viewZ) * this.cellSize;
  }
  private screenToWorldX(sx: number, screenW: number): number {
    return this.viewX + (sx - screenW / 2) / this.cellSize;
  }
  private screenToWorldZ(sy: number, screenH: number): number {
    return this.viewZ + (sy - screenH / 2) / this.cellSize;
  }

  // ── Event handlers ─────────────────────────────────────
  private handleMouseMove(e: MouseEvent): void {
    if (!this._visible) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = rect.width;
    const H = rect.height;

    if (this.isPanning) {
      const dx = (e.clientX - this.panMouseX) / this.cellSize;
      const dy = (e.clientY - this.panMouseZ) / this.cellSize;
      this.viewX = this.panStartX - dx;
      this.viewZ = this.panStartZ - dy;
      this.render();
      return;
    }

    this.hoverGridX = Math.floor(this.screenToWorldX(mx, W));
    this.hoverGridZ = Math.floor(this.screenToWorldZ(my, H));

    // Building tooltip
    const hoveredBld = this.castle.getBuildingAt(this.hoverGridX, this.hoverGridZ);
    if (hoveredBld && !this.selected && !this.rearrangeTarget) {
      const spawns = hoveredBld.spawnsUnits ? hoveredBld.spawnsUnits.join(', ') : 'none';
      const hpPct = Math.round((hoveredBld.hp / hoveredBld.maxHp) * 100);
      this.tooltip.innerHTML = `<div style="font-weight:bold;color:${TYPE_COLORS[hoveredBld.type] ?? '#fff'};margin-bottom:4px;">${TYPE_ICONS[hoveredBld.type] ?? ''} ${hoveredBld.type.toUpperCase()}</div>`
        + `<div>HP: ${hoveredBld.hp}/${hoveredBld.maxHp} (${hpPct}%)</div>`
        + `<div style="color:#7f8c8d;">Spawns: ${spawns}</div>`
        + `<div style="color:#555;font-size:10px;margin-top:4px;">Click to rearrange · Right-click to demolish</div>`;
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = (e.clientX + 14) + 'px';
      this.tooltip.style.top = (e.clientY - 10) + 'px';
    } else {
      this.tooltip.style.display = 'none';
    }

    this.render();
  }

  private handleClick(e: MouseEvent): void {
    if (!this._visible || e.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = Math.floor(this.screenToWorldX(mx, rect.width));
    const wz = Math.floor(this.screenToWorldZ(my, rect.height));

    // Rearrange mode: drop building at new location
    if (this.rearrangeTarget) {
      const existing = this.castle.getBuildingAt(wx, wz);
      if (existing && existing !== this.rearrangeTarget) { this.hud.showInfo('❌ Space occupied!', 1500); return; }
      this.rearrangeTarget.x = wx;
      this.rearrangeTarget.z = wz;
      this.hud.showInfo(`📦 ${this.rearrangeTarget.type} moved!`, 1500);
      this.rearrangeTarget = null;
      this.render();
      return;
    }

    // Click existing building to enter rearrange mode
    if (!this.selected) {
      const clickedBld = this.castle.getBuildingAt(wx, wz);
      if (clickedBld && clickedBld.type !== BuildingType.THRONE_ROOM) {
        this.rearrangeTarget = clickedBld;
        this.hud.showInfo(`📦 ${clickedBld.type} selected — click to move, ESC to cancel`, 3000);
        this.render();
        return;
      }
      return;
    }

    // Place new building
    const existingAtPlace = this.castle.getBuildingAt(wx, wz);
    if (existingAtPlace) { this.hud.showInfo('❌ Space already occupied!', 1500); return; }
    if (!this.checkCost(this.selected.cost)) { this.hud.showInfo('❌ Not enough materials!', 1500); return; }

    for (const req of this.selected.cost) {
      this.inventory.removeItem(req.itemId, req.count);
    }

    this.castle.addBuilding(this.selected.type, wx, this.castle.y, wz);
    this.hud.showInfo(`🏗️ ${this.selected.label} placed!`, 1500);

    if (this.buildCallback) {
      this.buildCallback(this.selected.type, wx, this.castle.y, wz);
    }

    this.buildPalette();
    this.render();
  }

  /** Right-click to demolish a building (50% material refund). */
  private handleRightClick(e: MouseEvent): void {
    e.preventDefault();
    if (!this._visible) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = Math.floor(this.screenToWorldX(mx, rect.width));
    const wz = Math.floor(this.screenToWorldZ(my, rect.height));

    const bld = this.castle.getBuildingAt(wx, wz);
    if (!bld || bld.type === BuildingType.THRONE_ROOM) return;

    // Find cost from BUILDING_OPTIONS
    const opt = BUILDING_OPTIONS.find(o => o.type === bld.type);
    if (opt) {
      // Refund 50%
      for (const req of opt.cost) {
        const refund = Math.floor(req.count * 0.5);
        if (refund > 0) this.inventory.addItem(req.itemId, refund);
      }
    }

    // Remove building
    const idx = this.castle.buildings.indexOf(bld);
    if (idx >= 0) this.castle.buildings.splice(idx, 1);
    this.hud.showInfo(`🗑️ ${bld.type} demolished (50% refunded)`, 2000);
    this.buildPalette();
    this.render();
  }

  private checkCost(cost: { itemId: string; count: number }[]): boolean {
    return cost.every(req => this.inventory.countItem(req.itemId) >= req.count);
  }

  /** Call each frame to keep HP bars in sync. */
  update(): void {
    if (this._visible) this.render();
  }

  destroy(): void {
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('click', this._onClick);
    window.removeEventListener('keydown', this._onKey);
    this.overlay.remove();
  }
}
