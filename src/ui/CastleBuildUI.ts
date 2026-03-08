/**
 * CastleBuildUI — Lets the player place castle buildings in the world.
 * Toggle with B key. Shows a ghost preview, deducts items on placement.
 */

import * as THREE from 'three';
import { BuildingType, Castle } from '../castle/Castle';
import type { Inventory } from '../crafting/Inventory';
import type { ChunkManager } from '../world/ChunkManager';
import type { HUD } from '../ui/HUD';
import { BlockType } from '../world/BlockType';

export interface BuildingOption {
  type: BuildingType;
  label: string;
  icon: string;
  cost: { itemId: string; count: number }[];
}

export const BUILDING_OPTIONS: BuildingOption[] = [
  { type: BuildingType.WALL, label: 'Wall', icon: '🧱',
    cost: [{ itemId: 'stone_brick', count: 20 }] },
  { type: BuildingType.WATCHTOWER, label: 'Watchtower', icon: '🗼',
    cost: [{ itemId: 'stone_brick', count: 40 }, { itemId: 'planks_oak', count: 10 }] },
  { type: BuildingType.GATE, label: 'Gate', icon: '🚪',
    cost: [{ itemId: 'planks_dark', count: 30 }, { itemId: 'iron_ingot', count: 5 }] },
  { type: BuildingType.BARRACKS, label: 'Barracks', icon: '⚔️',
    cost: [{ itemId: 'stone_brick', count: 30 }, { itemId: 'planks_oak', count: 20 }] },
  { type: BuildingType.ARCHERY_RANGE, label: 'Archery Range', icon: '🏹',
    cost: [{ itemId: 'planks_oak', count: 40 }, { itemId: 'string', count: 10 }] },
  { type: BuildingType.STABLE, label: 'Stable', icon: '🐴',
    cost: [{ itemId: 'planks_oak', count: 50 }, { itemId: 'iron_ingot', count: 8 }] },
  { type: BuildingType.SIEGE_WORKSHOP, label: 'Siege Workshop', icon: '💣',
    cost: [{ itemId: 'iron_ingot', count: 20 }, { itemId: 'planks_dark', count: 30 }] },
];

export class CastleBuildUI {
  private overlay: HTMLDivElement;
  private castle: Castle;
  private inventory: Inventory;
  private chunkManager: ChunkManager;
  private hud: HUD;
  private scene: THREE.Scene;
  private visible = false;
  private selectedBuilding: BuildingOption | null = null;
  private ghostMesh: THREE.Mesh | null = null;
  private placementPos: { x: number; y: number; z: number } | null = null;

  constructor(castle: Castle, inventory: Inventory, chunkManager: ChunkManager, hud: HUD, scene: THREE.Scene) {
    this.castle = castle;
    this.inventory = inventory;
    this.chunkManager = chunkManager;
    this.hud = hud;
    this.scene = scene;

    this.overlay = document.createElement('div');
    this.overlay.id = 'castle-build-ui';
    this.overlay.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);display:none;gap:8px;z-index:150;pointer-events:auto;';

    this.createButtons();
    document.body.appendChild(this.overlay);
  }

  private createButtons(): void {
    for (const opt of BUILDING_OPTIONS) {
      const btn = document.createElement('button');
      btn.style.cssText = 'background:rgba(0,0,0,0.7);border:2px solid rgba(255,255,255,0.3);color:#fff;padding:8px 12px;border-radius:6px;cursor:pointer;font-family:monospace;font-size:12px;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:100px;';

      const canAfford = this.checkCost(opt.cost);
      if (!canAfford) btn.style.opacity = '0.4';

      // Header with icon and label
      let html = `<span style="font-size:20px;">${opt.icon}</span><span style="font-weight:bold;">${opt.label}</span>`;
      // Cost lines with have/need
      html += '<div style="font-size:10px;line-height:1.5;margin-top:2px;width:100%;">';
      for (const c of opt.cost) {
        const have = this.inventory.countItem(c.itemId);
        const enough = have >= c.count;
        const color = enough ? '#2ecc71' : '#e74c3c';
        const name = c.itemId.replace(/_/g, ' ');
        html += `<div style="color:${color};">${c.count}× ${name} <span style="opacity:0.7;">(${have})</span></div>`;
      }
      html += '</div>';
      btn.innerHTML = html;

      btn.addEventListener('click', () => this.selectBuilding(opt));
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#f1c40f'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = this.selectedBuilding === opt ? '#2ecc71' : 'rgba(255,255,255,0.3)'; });
      btn.dataset.buildingType = opt.type;
      this.overlay.appendChild(btn);
    }
  }

  private selectBuilding(opt: BuildingOption): void {
    if (!this.checkCost(opt.cost)) {
      this.hud.showInfo('❌ Not enough materials!', 2000);
      return;
    }
    this.selectedBuilding = opt;
    this.hud.showInfo(`🏗️ Placing ${opt.label} — Click to place, ESC to cancel`);

    // Update button styling
    this.overlay.querySelectorAll('button').forEach((btn) => {
      (btn as HTMLElement).style.borderColor = btn.dataset.buildingType === opt.type ? '#2ecc71' : 'rgba(255,255,255,0.3)';
    });

    // Create ghost preview mesh
    this.removeGhost();
    const size = opt.type === BuildingType.WATCHTOWER ? 3 : 5;
    const geo = new THREE.BoxGeometry(size, 4, size);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.3, wireframe: true });
    this.ghostMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.ghostMesh);
  }

  /** Update ghost position to where player is looking. */
  updateGhost(playerX: number, playerY: number, playerZ: number, yaw: number): void {
    if (!this.ghostMesh || !this.selectedBuilding) return;

    // Place 8 blocks ahead of the player
    const dist = 8;
    const gx = Math.floor(playerX + Math.sin(yaw) * dist);
    const gz = Math.floor(playerZ + Math.cos(yaw) * dist);
    const gy = playerY;

    this.ghostMesh.position.set(gx + 0.5, gy + 2, gz + 0.5);
    this.placementPos = { x: gx, y: Math.floor(gy), z: gz };
  }

  /** Place the selected building. */
  placeBuilding(): boolean {
    if (!this.selectedBuilding || !this.placementPos) return false;
    if (!this.checkCost(this.selectedBuilding.cost)) {
      this.hud.showInfo('❌ Not enough materials!', 2000);
      return false;
    }

    // Deduct materials
    for (const req of this.selectedBuilding.cost) {
      this.inventory.removeItem(req.itemId, req.count);
    }

    const { x, y, z } = this.placementPos;
    this.castle.addBuilding(this.selectedBuilding.type, x, y + 1, z);

    // Type-specific 3D block placement
    const bt = this.selectedBuilding.type;
    if (bt === BuildingType.WALL) {
      // 1-wide wall, 5-high with battlements
      for (let dy = 0; dy < 5; dy++) {
        for (let d = -2; d <= 2; d++) {
          this.chunkManager.setBlockAtWorld(x + d, y + 1 + dy, z, BlockType.CASTLE_WALL);
          this.chunkManager.setBlockAtWorld(x, y + 1 + dy, z + d, BlockType.CASTLE_WALL);
        }
      }
      // Battlements
      for (let d = -2; d <= 2; d += 2) {
        this.chunkManager.setBlockAtWorld(x + d, y + 6, z, BlockType.CASTLE_WALL);
        this.chunkManager.setBlockAtWorld(x, y + 6, z + d, BlockType.CASTLE_WALL);
      }
    } else if (bt === BuildingType.GATE) {
      // Gate with archway opening
      for (let dy = 0; dy < 5; dy++) {
        this.chunkManager.setBlockAtWorld(x, y + 1 + dy, z - 2, BlockType.CASTLE_GATE);
        this.chunkManager.setBlockAtWorld(x, y + 1 + dy, z + 2, BlockType.CASTLE_GATE);
        if (dy >= 3) this.chunkManager.setBlockAtWorld(x, y + 1 + dy, z, BlockType.CASTLE_GATE);
      }
      for (let dz = -2; dz <= 2; dz++) {
        this.chunkManager.setBlockAtWorld(x, y + 6, z + dz, BlockType.CASTLE_WALL);
      }
    } else if (bt === BuildingType.WATCHTOWER) {
      // Tower: 3×3×8 with wider top platform
      for (let dy = 0; dy < 8; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            this.chunkManager.setBlockAtWorld(x + dx, y + 1 + dy, z + dz, BlockType.CASTLE_TOWER);
          }
        }
      }
      // Hollow inside
      for (let dy = 1; dy < 7; dy++) {
        this.chunkManager.setBlockAtWorld(x, y + 1 + dy, z, BlockType.AIR);
      }
      // Wide top platform
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          this.chunkManager.setBlockAtWorld(x + dx, y + 9, z + dz, BlockType.CASTLE_TOWER);
        }
      }
      // Battlements
      for (let d = -2; d <= 2; d += 2) {
        this.chunkManager.setBlockAtWorld(x + d, y + 10, z - 2, BlockType.CASTLE_WALL);
        this.chunkManager.setBlockAtWorld(x + d, y + 10, z + 2, BlockType.CASTLE_WALL);
        this.chunkManager.setBlockAtWorld(x - 2, y + 10, z + d, BlockType.CASTLE_WALL);
        this.chunkManager.setBlockAtWorld(x + 2, y + 10, z + d, BlockType.CASTLE_WALL);
      }
      this.chunkManager.setBlockAtWorld(x, y + 10, z, BlockType.TORCH);
    } else {
      // Standard buildings (barracks, archery, stable, siege)
      const size = 2;
      for (let dx = -size; dx <= size; dx++) {
        for (let dz = -size; dz <= size; dz++) {
          for (let dy = 0; dy < 4; dy++) {
            const isWall = Math.abs(dx) === size || Math.abs(dz) === size;
            this.chunkManager.setBlockAtWorld(
              x + dx, y + 1 + dy, z + dz,
              isWall ? BlockType.CASTLE_WALL : (dy === 0 ? BlockType.CASTLE_FLOOR : BlockType.AIR),
            );
          }
          this.chunkManager.setBlockAtWorld(x + dx, y + 5, z + dz, BlockType.PLANKS_DARK);
        }
      }
      // Door
      this.chunkManager.setBlockAtWorld(x + size, y + 2, z, BlockType.AIR);
      this.chunkManager.setBlockAtWorld(x + size, y + 3, z, BlockType.AIR);
      this.chunkManager.setBlockAtWorld(x, y + 4, z, BlockType.TORCH);
    }
    // Player banner
    this.chunkManager.setBlockAtWorld(x, y + 6, z, BlockType.BANNER_PLAYER);

    this.hud.showInfo(`🏗️ ${this.selectedBuilding.label} built!`);
    this.removeGhost();
    this.selectedBuilding = null;
    this.refreshButtons();
    return true;
  }

  private checkCost(cost: { itemId: string; count: number }[]): boolean {
    return cost.every((req) => this.inventory.countItem(req.itemId) >= req.count);
  }

  private removeGhost(): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      (this.ghostMesh.material as THREE.Material).dispose();
      this.ghostMesh = null;
    }
  }

  private refreshButtons(): void {
    // Rebuild buttons to update inventory counts
    this.overlay.innerHTML = '';
    this.createButtons();
  }

  toggle(): void {
    this.visible = !this.visible;
    this.overlay.style.display = this.visible ? 'flex' : 'none';
    if (!this.visible) {
      this.removeGhost();
      this.selectedBuilding = null;
    } else {
      this.refreshButtons();
    }
  }

  cancel(): void {
    this.removeGhost();
    this.selectedBuilding = null;
    this.visible = false;
    this.overlay.style.display = 'none';
  }

  get isVisible(): boolean { return this.visible; }
  get isPlacing(): boolean { return this.selectedBuilding !== null; }
  destroy(): void { this.removeGhost(); this.overlay.remove(); }
}
