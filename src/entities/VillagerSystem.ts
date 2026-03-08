/**
 * VillagerSystem — Spawns and manages NPC villagers in discovered villages.
 *
 * Villagers wander near their home village, can be interacted with (E key),
 * and offer trading or recruitment. Each villager has a profession that
 * determines their trade offers.
 */

import * as THREE from 'three';
import type { StructureLocation } from '../world/StructureGenerator';

// ── Professions & Trades ────────────────────────────────────
export enum VillagerProfession {
  BLACKSMITH = 'blacksmith',
  FARMER = 'farmer',
  MERCHANT = 'merchant',
  RECRUITER = 'recruiter',
}

export interface TradeOffer {
  give: { itemId: string; count: number }[];   // what player pays
  receive: { itemId: string; count: number };   // what player gets
  stock: number;    // how many times this trade can be done (refreshes)
  used: number;     // how many times it's been used
}

export interface Villager {
  id: string;
  name: string;
  profession: VillagerProfession;
  trades: TradeOffer[];
  x: number; y: number; z: number;
  homeX: number; homeZ: number;
  mesh: THREE.Group;
  wanderAngle: number;
  wanderTimer: number;
}

// ── Names ───────────────────────────────────────────────────
const NAMES = [
  'Erik', 'Helga', 'Bjorn', 'Astrid', 'Gunnar', 'Freya', 'Ragnar', 'Sigrid',
  'Leif', 'Ingrid', 'Sven', 'Thora', 'Olaf', 'Hilda', 'Magnus', 'Liv',
];

// ── Trade tables per profession ─────────────────────────────
function generateTrades(prof: VillagerProfession): TradeOffer[] {
  switch (prof) {
    case VillagerProfession.BLACKSMITH:
      return [
        { give: [{ itemId: 'iron_ingot', count: 4 }], receive: { itemId: 'iron_sword', count: 1 }, stock: 3, used: 0 },
        { give: [{ itemId: 'iron_ingot', count: 6 }], receive: { itemId: 'iron_pickaxe', count: 1 }, stock: 2, used: 0 },
        { give: [{ itemId: 'gold_ingot', count: 8 }], receive: { itemId: 'gold_sword', count: 1 }, stock: 1, used: 0 },
        { give: [{ itemId: 'iron_ingot', count: 3 }, { itemId: 'coal', count: 5 }], receive: { itemId: 'iron_helmet', count: 1 }, stock: 2, used: 0 },
      ];
    case VillagerProfession.FARMER:
      return [
        { give: [{ itemId: 'gold_ingot', count: 1 }], receive: { itemId: 'bread', count: 8 }, stock: 5, used: 0 },
        { give: [{ itemId: 'gold_ingot', count: 1 }], receive: { itemId: 'apple', count: 6 }, stock: 5, used: 0 },
        { give: [{ itemId: 'gold_ingot', count: 3 }], receive: { itemId: 'cooked_meat', count: 10 }, stock: 3, used: 0 },
        { give: [{ itemId: 'diamond', count: 1 }], receive: { itemId: 'golden_apple', count: 2 }, stock: 1, used: 0 },
      ];
    case VillagerProfession.MERCHANT:
      return [
        { give: [{ itemId: 'gold_ingot', count: 5 }], receive: { itemId: 'diamond', count: 1 }, stock: 2, used: 0 },
        { give: [{ itemId: 'iron_ingot', count: 10 }], receive: { itemId: 'gold_ingot', count: 3 }, stock: 4, used: 0 },
        { give: [{ itemId: 'cobblestone', count: 32 }], receive: { itemId: 'iron_ingot', count: 2 }, stock: 5, used: 0 },
        { give: [{ itemId: 'crystal', count: 2 }], receive: { itemId: 'crystal_pickaxe', count: 1 }, stock: 1, used: 0 },
      ];
    case VillagerProfession.RECRUITER:
      return [
        { give: [{ itemId: 'gold_ingot', count: 3 }, { itemId: 'iron_sword', count: 1 }], receive: { itemId: '_recruit_swordsman', count: 1 }, stock: 3, used: 0 },
        { give: [{ itemId: 'gold_ingot', count: 5 }, { itemId: 'bow', count: 1 }], receive: { itemId: '_recruit_archer', count: 1 }, stock: 2, used: 0 },
        { give: [{ itemId: 'gold_ingot', count: 8 }], receive: { itemId: '_recruit_shield', count: 1 }, stock: 1, used: 0 },
      ];
  }
}

const PROF_COLORS: Record<VillagerProfession, number> = {
  [VillagerProfession.BLACKSMITH]: 0x555555,
  [VillagerProfession.FARMER]: 0x558833,
  [VillagerProfession.MERCHANT]: 0x886622,
  [VillagerProfession.RECRUITER]: 0x443388,
};

const PROF_ICONS: Record<VillagerProfession, string> = {
  [VillagerProfession.BLACKSMITH]: '⚒️',
  [VillagerProfession.FARMER]: '🌾',
  [VillagerProfession.MERCHANT]: '💰',
  [VillagerProfession.RECRUITER]: '⚔️',
};

// ── System ──────────────────────────────────────────────────
export class VillagerSystem {
  private scene: THREE.Scene;
  private villagers: Villager[] = [];
  private spawnedVillages = new Set<string>();
  private interactionRange = 3.5;

  // Callbacks
  private onInteract: ((villager: Villager) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Register callback for villager interaction. */
  setInteractionCallback(cb: (villager: Villager) => void): void {
    this.onInteract = cb;
  }

  /** Spawn villagers at a village structure location. */
  spawnVillagersAtStructure(loc: StructureLocation): void {
    const key = `${loc.x},${loc.z}`;
    if (this.spawnedVillages.has(key)) return;
    this.spawnedVillages.add(key);

    // Spawn 3 villagers with different professions
    const profs = [
      VillagerProfession.BLACKSMITH,
      VillagerProfession.FARMER,
      VillagerProfession.MERCHANT,
    ];
    // 25% chance of a recruiter replacing merchant
    if (Math.random() < 0.4) profs[2] = VillagerProfession.RECRUITER;

    for (let i = 0; i < 3; i++) {
      const vx = loc.x + i * 8 - 8 + (Math.random() - 0.5) * 3;
      const vz = loc.z + (Math.random() - 0.5) * 3;
      this.spawnVillager(profs[i], vx, loc.y + 1, vz, loc.x, loc.z);
    }
  }

  private spawnVillager(prof: VillagerProfession, x: number, y: number, z: number, homeX: number, homeZ: number): void {
    const id = `villager_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const trades = generateTrades(prof);

    // Build mesh
    const group = new THREE.Group();
    const bodyColor = PROF_COLORS[prof];

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.9, 0.35),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 })
    );
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);

    // Head (skin colored)
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 })
    );
    head.position.y = 1.28;
    head.castShadow = true;
    group.add(head);

    // Legs
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.4, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x554433 })
      );
      leg.position.set(side * 0.12, 0.2, 0);
      group.add(leg);
    }

    // Name label (canvas sprite)
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 48;
    const ctx = labelCanvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 256, 48);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`${PROF_ICONS[prof]} ${name}`, 128, 20);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(prof, 128, 40);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
    const label = new THREE.Sprite(labelMat);
    label.scale.set(2.0, 0.4, 1);
    label.position.y = 1.8;
    group.add(label);

    group.position.set(x, y, z);
    this.scene.add(group);

    this.villagers.push({
      id, name, profession: prof, trades,
      x, y, z, homeX, homeZ,
      mesh: group,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: Math.random() * 5,
    });
  }

  /** Update all villagers. */
  update(dt: number, playerX: number, _playerY: number, playerZ: number): void {
    for (const v of this.villagers) {
      // Wander near home
      v.wanderTimer -= dt;
      if (v.wanderTimer <= 0) {
        v.wanderTimer = 3 + Math.random() * 4;
        v.wanderAngle = Math.random() * Math.PI * 2;
      }

      const homeDistX = v.x - v.homeX;
      const homeDistZ = v.z - v.homeZ;
      const homeDist = Math.sqrt(homeDistX * homeDistX + homeDistZ * homeDistZ);

      if (homeDist > 8) {
        // Too far, walk back
        const angle = Math.atan2(v.homeZ - v.z, v.homeX - v.x);
        v.x += Math.cos(angle) * 0.8 * dt;
        v.z += Math.sin(angle) * 0.8 * dt;
      } else {
        // Random wander
        v.x += Math.cos(v.wanderAngle) * 0.4 * dt;
        v.z += Math.sin(v.wanderAngle) * 0.4 * dt;
      }

      // Face player when close
      const dx = playerX - v.x;
      const dz = playerZ - v.z;
      const distToPlayer = Math.sqrt(dx * dx + dz * dz);
      if (distToPlayer < this.interactionRange * 2) {
        v.mesh.rotation.y = Math.atan2(dx, dz);
      }

      v.mesh.position.set(v.x, v.y, v.z);
    }
  }

  /** Try to interact with the nearest villager. Returns true if one was found. */
  tryInteract(playerX: number, playerY: number, playerZ: number): boolean {
    let nearest: Villager | null = null;
    let nearestDist = this.interactionRange;

    for (const v of this.villagers) {
      const dx = v.x - playerX;
      const dz = v.z - playerZ;
      const dy = v.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = v;
      }
    }

    if (nearest && this.onInteract) {
      this.onInteract(nearest);
      return true;
    }
    return false;
  }

  /** Get the nearest villager in range (for HUD prompt). */
  getNearestInRange(px: number, py: number, pz: number): Villager | null {
    let nearest: Villager | null = null;
    let nearestDist = this.interactionRange;
    for (const v of this.villagers) {
      const d = Math.sqrt((v.x - px) ** 2 + (v.y - py) ** 2 + (v.z - pz) ** 2);
      if (d < nearestDist) { nearestDist = d; nearest = v; }
    }
    return nearest;
  }

  get villagerCount(): number { return this.villagers.length; }
}
