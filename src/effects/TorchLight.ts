/**
 * TorchLight — Dynamic point lights for torches and campfires.
 * Flickers realistically, pools near placed torches.
 */

import * as THREE from 'three';

interface TorchEntry {
  light: THREE.PointLight;
  x: number; y: number; z: number;
  baseIntensity: number;
  flickerSpeed: number;
  flickerAmount: number;
}

export class TorchLightManager {
  private scene: THREE.Scene;
  private torches: TorchEntry[] = [];
  private maxLights = 8; // GPU limit
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Add a torch light at a world position. */
  addTorch(x: number, y: number, z: number, color = 0xff8833, intensity = 1.2): void {
    // Don't exceed GPU light limit — remove farthest if needed
    if (this.torches.length >= this.maxLights) return;

    const light = new THREE.PointLight(color, intensity, 12, 2);
    light.position.set(x + 0.5, y + 0.8, z + 0.5);
    light.castShadow = false; // Too expensive for many lights
    this.scene.add(light);

    this.torches.push({
      light, x, y, z,
      baseIntensity: intensity,
      flickerSpeed: 4 + Math.random() * 3,
      flickerAmount: 0.15 + Math.random() * 0.15,
    });
  }

  /** Remove torch light near a position. */
  removeTorch(x: number, y: number, z: number): void {
    const idx = this.torches.findIndex((t) => t.x === x && t.y === y && t.z === z);
    if (idx === -1) return;
    const torch = this.torches[idx];
    this.scene.remove(torch.light);
    torch.light.dispose();
    this.torches.splice(idx, 1);
  }

  /** Update torch positions relative to player and apply flicker. */
  update(dt: number, playerX: number, playerZ: number): void {
    this.time += dt;

    for (const torch of this.torches) {
      // Flicker
      const flicker = Math.sin(this.time * torch.flickerSpeed) * torch.flickerAmount
        + Math.sin(this.time * torch.flickerSpeed * 1.7 + 1.3) * torch.flickerAmount * 0.5;
      torch.light.intensity = torch.baseIntensity + flicker;

      // Slight position wobble for realism
      torch.light.position.x = torch.x + 0.5 + Math.sin(this.time * 2.3) * 0.02;
      torch.light.position.z = torch.z + 0.5 + Math.cos(this.time * 1.9) * 0.02;

      // Disable lights far from player for performance
      const dx = torch.x - playerX, dz = torch.z - playerZ;
      torch.light.visible = (dx * dx + dz * dz) < 40 * 40;
    }
  }

  get count(): number { return this.torches.length; }

  destroy(): void {
    for (const t of this.torches) {
      this.scene.remove(t.light);
      t.light.dispose();
    }
    this.torches = [];
  }
}
