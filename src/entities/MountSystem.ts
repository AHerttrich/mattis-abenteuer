/**
 * MountSystem — Rideable mounts (horses) found near villages.
 * When mounted, player speed increases 2.5x. Dismount with E.
 */

import * as THREE from 'three';

export interface Mount {
  id: string;
  name: string;
  x: number; y: number; z: number;
  mesh: THREE.Group;
  speed: number;
  claimed: boolean;
}

const HORSE_NAMES = ['Blitz', 'Storm', 'Shadow', 'Thunder', 'Frost', 'Ember', 'Breeze', 'Midnight'];

export class MountSystem {
  private scene: THREE.Scene;
  private mounts: Mount[] = [];
  private activeMountId: string | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Spawn a horse near a village. */
  spawnHorse(x: number, y: number, z: number): void {
    const id = `mount_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const name = HORSE_NAMES[Math.floor(Math.random() * HORSE_NAMES.length)];

    const group = new THREE.Group();

    // Horse body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 })
    );
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.35, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6 })
    );
    head.position.set(0, 1.1, 0.6);
    head.castShadow = true;
    group.add(head);

    // Legs (4)
    for (const fx of [-1, 1]) {
      for (const fz of [-1, 1]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.5, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x6B3410 })
        );
        leg.position.set(fx * 0.22, 0.25, fz * 0.4);
        group.add(leg);
      }
    }

    // Name label
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`🐴 ${name}`, 64, 20);
    const labelTex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }));
    label.scale.set(1.6, 0.4, 1);
    label.position.y = 1.6;
    group.add(label);

    group.position.set(x, y, z);
    this.scene.add(group);

    this.mounts.push({ id, name, x, y, z, mesh: group, speed: 2.5, claimed: false });
  }

  /** Try to mount the nearest horse. Returns speed multiplier or null. */
  tryMount(px: number, py: number, pz: number): { mountId: string; speed: number; name: string } | null {
    if (this.activeMountId) return null;
    for (const m of this.mounts) {
      const d = Math.sqrt((m.x - px) ** 2 + (m.y - py) ** 2 + (m.z - pz) ** 2);
      if (d < 3) {
        this.activeMountId = m.id;
        m.claimed = true;
        m.mesh.visible = false;
        return { mountId: m.id, speed: m.speed, name: m.name };
      }
    }
    return null;
  }

  /** Dismount at position. */
  dismount(px: number, py: number, pz: number): boolean {
    if (!this.activeMountId) return false;
    const mount = this.mounts.find(m => m.id === this.activeMountId);
    if (mount) {
      mount.x = px + 1; mount.y = py; mount.z = pz + 1;
      mount.mesh.position.set(mount.x, mount.y, mount.z);
      mount.mesh.visible = true;
    }
    this.activeMountId = null;
    return true;
  }

  /** Get nearest mount in range (for HUD prompt). */
  getNearestInRange(px: number, py: number, pz: number): Mount | null {
    if (this.activeMountId) return null;
    let nearest: Mount | null = null;
    let nd = 3;
    for (const m of this.mounts) {
      const d = Math.sqrt((m.x - px) ** 2 + (m.y - py) ** 2 + (m.z - pz) ** 2);
      if (d < nd) { nd = d; nearest = m; }
    }
    return nearest;
  }

  get isMounted(): boolean { return this.activeMountId !== null; }
  get mountCount(): number { return this.mounts.length; }
}
