/**
 * ParticleSystem — GPU-friendly block-breaking and impact particles.
 * Uses THREE.Points for efficient rendering.
 */

import * as THREE from 'three';

interface ParticleBurst {
  points: THREE.Points;
  velocities: Float32Array;
  age: number;
  maxAge: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private bursts: ParticleBurst[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Spawn block-breaking particles at a position with a given color. */
  emitBlockBreak(x: number, y: number, z: number, color: number): void {
    const count = 12;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const c = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Random position within the block
      positions[i3] = x + 0.2 + Math.random() * 0.6;
      positions[i3 + 1] = y + 0.2 + Math.random() * 0.6;
      positions[i3 + 2] = z + 0.2 + Math.random() * 0.6;

      // Random velocity outward
      velocities[i3] = (Math.random() - 0.5) * 4;
      velocities[i3 + 1] = Math.random() * 5 + 1;
      velocities[i3 + 2] = (Math.random() - 0.5) * 4;

      // Slightly varied color
      const vary = 0.8 + Math.random() * 0.4;
      colors[i3] = c.r * vary;
      colors[i3 + 1] = c.g * vary;
      colors[i3 + 2] = c.b * vary;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.bursts.push({ points, velocities, age: 0, maxAge: 0.8 });
  }

  /** Spawn explosion particles (bigger, more intense). */
  emitExplosion(x: number, y: number, z: number): void {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = x + (Math.random() - 0.5) * 2;
      positions[i3 + 1] = y + Math.random() * 2;
      positions[i3 + 2] = z + (Math.random() - 0.5) * 2;

      velocities[i3] = (Math.random() - 0.5) * 10;
      velocities[i3 + 1] = Math.random() * 8 + 2;
      velocities[i3 + 2] = (Math.random() - 0.5) * 10;

      // Fire colors
      const t = Math.random();
      colors[i3] = 1.0;
      colors[i3 + 1] = t * 0.6;
      colors[i3 + 2] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.bursts.push({ points, velocities, age: 0, maxAge: 1.2 });
  }

  update(dt: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.bursts.length; i++) {
      const burst = this.bursts[i];
      burst.age += dt;

      if (burst.age >= burst.maxAge) {
        toRemove.push(i);
        continue;
      }

      // Update positions with velocity + gravity
      const posAttr = burst.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let j = 0; j < positions.length; j += 3) {
        positions[j] += burst.velocities[j] * dt;
        positions[j + 1] += burst.velocities[j + 1] * dt;
        positions[j + 2] += burst.velocities[j + 2] * dt;

        // Gravity
        burst.velocities[j + 1] -= 15 * dt;
      }
      posAttr.needsUpdate = true;

      // Fade out
      const mat = burst.points.material as THREE.PointsMaterial;
      mat.opacity = 1.0 - burst.age / burst.maxAge;
    }

    // Remove expired
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const burst = this.bursts[idx];
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      (burst.points.material as THREE.Material).dispose();
      this.bursts.splice(idx, 1);
    }
  }

  destroy(): void {
    for (const burst of this.bursts) {
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      (burst.points.material as THREE.Material).dispose();
    }
    this.bursts = [];
  }
}
