/**
 * WaterRenderer — Animated transparent water blocks with wave motion.
 * Replaces flat blue water with translucent shimmering surface.
 */

import * as THREE from 'three';

export class WaterRenderer {
  private waterMeshes: THREE.Mesh[] = [];
  private scene: THREE.Scene;
  private material: THREE.ShaderMaterial;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x1a6b8a) },
        uOpacity: { value: 0.7 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 pos = position;
          vWave = sin(pos.x * 3.0 + uTime * 2.0) * 0.05 + cos(pos.z * 2.5 + uTime * 1.5) * 0.04;
          pos.y += vWave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          float shimmer = 0.9 + 0.1 * sin(vUv.x * 20.0 + uTime * 3.0) * cos(vUv.y * 15.0 + uTime * 2.0);
          vec3 color = uColor * shimmer;
          color += vec3(0.1, 0.15, 0.2) * (vWave + 0.05);
          gl_FragColor = vec4(color, uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  /** Create a water surface at a chunk position. */
  addWaterSurface(x: number, y: number, z: number, width: number, depth: number): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(width, depth, width * 2, depth * 2);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x + width / 2, y + 0.85, z + depth / 2);
    this.scene.add(mesh);
    this.waterMeshes.push(mesh);
    return mesh;
  }

  update(dt: number): void {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;
  }

  /** Set day/night tint. */
  setTimeOfDay(t: number): void {
    const isNight = t > 0.8 || t < 0.2;
    if (isNight) {
      this.material.uniforms.uColor.value.setHex(0x0a3a4a);
      this.material.uniforms.uOpacity.value = 0.8;
    } else {
      this.material.uniforms.uColor.value.setHex(0x1a6b8a);
      this.material.uniforms.uOpacity.value = 0.7;
    }
  }

  destroy(): void {
    for (const mesh of this.waterMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.material.dispose();
    this.waterMeshes = [];
  }
}
