/**
 * SkySystem — Dynamic sky with animated clouds and gradient dome.
 *
 * Creates a sky sphere with gradient coloring and a cloud layer
 * that slowly rotates. Integrates with DayNightCycle for color shifts.
 */

import * as THREE from 'three';

export class SkySystem {
  private skyMesh: THREE.Mesh;
  private cloudMesh: THREE.Mesh;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private starField: THREE.Points;

  constructor(scene: THREE.Scene) {
    // Sky dome
    const skyGeo = new THREE.SphereGeometry(500, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0x87ceeb) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.skyMesh);

    // Cloud layer — flat plane with procedural cloud texture
    const cloudCanvas = this.generateCloudTexture();
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
    const cloudGeo = new THREE.PlaneGeometry(800, 800);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.cloudMesh.rotation.x = -Math.PI / 2;
    this.cloudMesh.position.y = 200;
    scene.add(this.cloudMesh);

    // Sun
    const sunGeo = new THREE.SphereGeometry(8, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(this.sunMesh);

    // Moon
    const moonGeo = new THREE.SphereGeometry(5, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xccccdd });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(this.moonMesh);

    // Stars
    const starCount = 200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2); // upper hemisphere
      const r = 450;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: false,
    });
    this.starField = new THREE.Points(starGeo, starMat);
    this.starField.visible = false;
    scene.add(this.starField);
  }

  /** Update sky based on time of day (0-1, 0.25 = noon, 0.75 = midnight). */
  update(timeOfDay: number, playerX: number, playerZ: number): void {
    // Center sky on player
    this.skyMesh.position.set(playerX, 0, playerZ);
    this.cloudMesh.position.set(playerX, 200, playerZ);

    // Slowly rotate clouds
    this.cloudMesh.rotation.z += 0.0002;

    // Sky colors based on time
    const mat = this.skyMesh.material as THREE.ShaderMaterial;
    if (timeOfDay > 0.2 && timeOfDay < 0.8) {
      // Day
      const dayProgress = (timeOfDay - 0.2) / 0.6;
      const noon = 1 - Math.abs(dayProgress - 0.5) * 2;
      mat.uniforms.topColor.value.setHSL(0.58, 0.7, 0.3 + noon * 0.3);
      mat.uniforms.bottomColor.value.setHSL(0.55, 0.5, 0.6 + noon * 0.2);
      (this.cloudMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + noon * 0.2;
      this.starField.visible = false;
    } else {
      // Night
      mat.uniforms.topColor.value.setHSL(0.65, 0.8, 0.05);
      mat.uniforms.bottomColor.value.setHSL(0.6, 0.5, 0.1);
      (this.cloudMesh.material as THREE.MeshBasicMaterial).opacity = 0.1;
      this.starField.visible = true;
      this.starField.position.set(playerX, 0, playerZ);
    }

    // Sunrise/sunset colors
    if ((timeOfDay > 0.15 && timeOfDay < 0.25) || (timeOfDay > 0.75 && timeOfDay < 0.85)) {
      mat.uniforms.bottomColor.value.setHSL(0.05, 0.8, 0.5);
    }

    // Sun position
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
    this.sunMesh.position.set(
      playerX + Math.cos(sunAngle) * 300,
      Math.sin(sunAngle) * 300,
      playerZ,
    );
    this.sunMesh.visible = timeOfDay > 0.15 && timeOfDay < 0.85;

    // Moon position (opposite to sun)
    this.moonMesh.position.set(
      playerX - Math.cos(sunAngle) * 300,
      -Math.sin(sunAngle) * 300,
      playerZ,
    );
    this.moonMesh.visible = !this.sunMesh.visible;
  }

  private generateCloudTexture(): HTMLCanvasElement {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Generate cloud-like pattern using overlapping circles
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 60; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 15 + Math.random() * 30;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  destroy(): void {
    this.skyMesh.geometry.dispose();
    this.cloudMesh.geometry.dispose();
    this.sunMesh.geometry.dispose();
    this.moonMesh.geometry.dispose();
    this.starField.geometry.dispose();
  }
}
