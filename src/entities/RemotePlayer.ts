/**
 * RemotePlayer — Renders a remote player's avatar in the 3D scene.
 *
 * Receives position updates from the network and smoothly interpolates
 * between them for fluid movement.
 */

import * as THREE from 'three';

export class RemotePlayer {
  readonly group: THREE.Group;
  private targetPos = new THREE.Vector3();
  private targetYaw = 0;
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private nameTag: HTMLDivElement;
  private camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera, name = 'Player 2') {
    this.camera = camera;
    this.group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3498db });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.8;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf5cba7 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.65;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.25);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2980b9 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5, 0.8, 0);
    this.group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.5, 0.8, 0);
    this.group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a5276 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.3, 0);
    this.group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.3, 0);
    this.group.add(rightLeg);

    this.group.visible = false;
    scene.add(this.group);

    // Floating nametag
    this.nameTag = document.createElement('div');
    this.nameTag.textContent = name;
    this.nameTag.style.cssText = `
      position:absolute;font-family:'Segoe UI',sans-serif;font-size:14px;
      color:#fff;text-shadow:1px 1px 3px #000;pointer-events:none;
      background:rgba(0,0,0,0.4);padding:2px 8px;border-radius:4px;
      display:none;z-index:50;transform:translate(-50%,-100%);
    `;
    document.body.appendChild(this.nameTag);
  }

  /** Set the target position from a network update. */
  setTarget(x: number, y: number, z: number, yaw: number): void {
    this.targetPos.set(x, y, z);
    this.targetYaw = yaw;
    this.group.visible = true;
  }

  /** Smooth interpolation each frame. */
  update(_dt: number): void {
    if (!this.group.visible) return;

    // Lerp position
    this.group.position.lerp(this.targetPos, 0.15);

    // Lerp rotation
    let diff = this.targetYaw - this.group.rotation.y;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * 0.15;

    // Update nametag screen position
    const worldPos = new THREE.Vector3();
    worldPos.copy(this.group.position);
    worldPos.y += 2.2;
    const v = worldPos.project(this.camera);

    if (v.z < 1) {
      const w = window.innerWidth,
        h = window.innerHeight;
      const sx = (v.x * 0.5 + 0.5) * w;
      const sy = -(v.y * 0.5 - 0.5) * h;
      this.nameTag.style.left = `${sx}px`;
      this.nameTag.style.top = `${sy}px`;
      this.nameTag.style.display = 'block';
    } else {
      this.nameTag.style.display = 'none';
    }
  }

  /** Remove from scene. */
  destroy(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.nameTag.remove();
  }
}
