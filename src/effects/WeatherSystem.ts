/**
 * WeatherSystem — Per-biome weather effects using particle systems.
 *
 * Rain in swamp/forest, snow in tundra, clear elsewhere.
 * Particles follow the player and transition smoothly between states.
 */

import * as THREE from 'three';
import type { WorldGenerator } from '../world/WorldGenerator';

export enum WeatherType {
  CLEAR,
  RAIN,
  SNOW,
}

export class WeatherSystem {
  private scene: THREE.Scene;
  private worldGen: WorldGenerator;
  private particles: THREE.Points;
  private particleCount = 600;
  private currentWeather = WeatherType.CLEAR;
  private targetWeather = WeatherType.CLEAR;
  private intensity = 0; // 0-1, transitions smoothly

  constructor(scene: THREE.Scene, worldGen: WorldGenerator) {
    this.scene = scene;
    this.worldGen = worldGen;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);

    // Initialize random positions in a box around origin
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.15,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number): void {
    // Determine weather from biome
    const biome = this.worldGen.getBiome(playerX, playerZ);
    if (biome === 'tundra') {
      this.targetWeather = WeatherType.SNOW;
    } else if (biome === 'swamp' || biome === 'forest') {
      this.targetWeather = WeatherType.RAIN;
    } else {
      this.targetWeather = WeatherType.CLEAR;
    }

    // Smoothly transition intensity
    if (this.targetWeather !== WeatherType.CLEAR) {
      this.intensity = Math.min(1, this.intensity + dt * 0.5);
      this.currentWeather = this.targetWeather;
    } else {
      this.intensity = Math.max(0, this.intensity - dt * 0.3);
    }

    // Update material
    const mat = this.particles.material as THREE.PointsMaterial;
    mat.opacity = this.intensity * 0.6;

    if (this.currentWeather === WeatherType.SNOW) {
      mat.color.set(0xeeeeff);
      mat.size = 0.2;
    } else if (this.currentWeather === WeatherType.RAIN) {
      mat.color.set(0x8899bb);
      mat.size = 0.08;
    }

    // Center particles around player
    this.particles.position.set(playerX, playerY, playerZ);

    // Animate particles
    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      if (this.currentWeather === WeatherType.RAIN) {
        // Rain: fast downward, slight angle
        arr[i3 + 1] -= dt * (12 + Math.random() * 4);
        arr[i3] += dt * 1.5; // Wind drift
      } else if (this.currentWeather === WeatherType.SNOW) {
        // Snow: slow downward, drifting
        arr[i3 + 1] -= dt * (1.5 + Math.random());
        arr[i3] += Math.sin(arr[i3 + 1] * 0.3 + i) * dt * 0.8;
        arr[i3 + 2] += Math.cos(arr[i3 + 1] * 0.2 + i * 0.7) * dt * 0.5;
      }

      // Reset particles that fall below
      if (arr[i3 + 1] < -15) {
        arr[i3] = (Math.random() - 0.5) * 40;
        arr[i3 + 1] = 15 + Math.random() * 15;
        arr[i3 + 2] = (Math.random() - 0.5) * 40;
      }
    }
    positions.needsUpdate = true;
  }

  destroy(): void {
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}
