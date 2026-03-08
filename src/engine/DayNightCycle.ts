/**
 * DayNightCycle — Simulates a day/night cycle with sky color and light changes.
 */

import * as THREE from 'three';

export class DayNightCycle {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private timeOfDay = 0.25; // 0-1, start at morning (0.25 = 6:00 AM)
  private dayDuration = 600; // seconds for a full day (10 min)

  // Sky colors at different times
  private readonly skyColors = {
    dawn: new THREE.Color(0xff9966),
    day: new THREE.Color(0x87ceeb),
    dusk: new THREE.Color(0xff6633),
    night: new THREE.Color(0x151540),
  };

  constructor(scene: THREE.Scene, sunLight: THREE.DirectionalLight, ambientLight: THREE.AmbientLight) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.ambientLight = ambientLight;
  }

  update(dt: number): void {
    this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1.0;
    this.updateSky();
    this.updateLighting();
    this.updateSunPosition();
  }

  private updateSky(): void {
    const t = this.timeOfDay;
    let color: THREE.Color;

    if (t < 0.2) {
      // Night → Dawn (0.0 - 0.2)
      const f = t / 0.2;
      color = this.skyColors.night.clone().lerp(this.skyColors.dawn, f);
    } else if (t < 0.3) {
      // Dawn → Day (0.2 - 0.3)
      const f = (t - 0.2) / 0.1;
      color = this.skyColors.dawn.clone().lerp(this.skyColors.day, f);
    } else if (t < 0.7) {
      // Day (0.3 - 0.7)
      color = this.skyColors.day.clone();
    } else if (t < 0.8) {
      // Day → Dusk (0.7 - 0.8)
      const f = (t - 0.7) / 0.1;
      color = this.skyColors.day.clone().lerp(this.skyColors.dusk, f);
    } else if (t < 0.9) {
      // Dusk → Night (0.8 - 0.9)
      const f = (t - 0.8) / 0.1;
      color = this.skyColors.dusk.clone().lerp(this.skyColors.night, f);
    } else {
      // Night (0.9 - 1.0)
      color = this.skyColors.night.clone();
    }

    this.scene.background = color;
    // Support both Fog and FogExp2
    if (this.scene.fog) {
      if ('color' in this.scene.fog) {
        (this.scene.fog as THREE.Fog | THREE.FogExp2).color.copy(color);
      }
    }
  }

  private updateLighting(): void {
    const t = this.timeOfDay;
    // Sun intensity peaks at noon (0.5), zero at night
    const sunAngle = Math.sin(t * Math.PI);
    const sunIntensity = Math.max(0, sunAngle) * 1.1;
    const ambientIntensity = 0.35 + Math.max(0, sunAngle) * 0.45;

    this.sunLight.intensity = sunIntensity;
    this.ambientLight.intensity = ambientIntensity;

    // Warm light at dawn/dusk, cool at noon
    if (t > 0.15 && t < 0.35) {
      this.sunLight.color.setHex(0xffeedd); // warm
    } else if (t > 0.65 && t < 0.85) {
      this.sunLight.color.setHex(0xffaa66); // orange dusk
    } else {
      this.sunLight.color.setHex(0xffffff); // neutral
    }
  }

  private updateSunPosition(): void {
    const angle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const radius = 200;
    this.sunLight.position.y = Math.sin(angle) * radius;
    // X and Z are set by main loop to follow player
  }

  /** Get a display string for the time (24h format). */
  getTimeString(): string {
    const hours = Math.floor(this.timeOfDay * 24);
    const minutes = Math.floor((this.timeOfDay * 24 - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /** Check if it's approximately night time. */
  get isNight(): boolean {
    return this.timeOfDay > 0.8 || this.timeOfDay < 0.2;
  }

  get time(): number { return this.timeOfDay; }
  set time(v: number) { this.timeOfDay = Math.max(0, Math.min(1, v)); }
}
