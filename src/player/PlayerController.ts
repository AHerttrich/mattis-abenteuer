/**
 * PlayerController — First-person movement and camera controls.
 */

import * as THREE from 'three';
import { InputManager } from '../engine/InputManager';
import {
  PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_EYE_HEIGHT, GRAVITY, JUMP_FORCE,
  TERMINAL_VELOCITY, PLAYER_HEIGHT, PLAYER_WIDTH, FOV,
  HEAD_BOB_SPEED, HEAD_BOB_AMOUNT, HEAD_BOB_SWAY, SPRINT_FOV_BOOST,
  ACCELERATION_TIME, LANDING_DIP_AMOUNT, LANDING_DIP_RECOVERY,
} from '../utils/constants';
import { eventBus } from '../utils';
import type { ChunkManager } from '../world/ChunkManager';
import { isBlockSolid } from '../world/BlockType';

export class PlayerController {
  readonly camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private chunkManager: ChunkManager;

  // Position & physics
  x = 0; y = 40; z = 0;
  velocityY = 0;
  yaw = 0;   // left-right rotation
  pitch = 0; // up-down rotation
  isGrounded = false;

  // Fall damage tracking
  private highestY = 0;        // highest Y while airborne
  private lastFallDamage = 0;  // damage from last fall (read by main.ts)

  // Movement feel
  private moveSpeed = 0;             // current speed (ramps up)
  private bobPhase = 0;              // head bob oscillation phase
  private landingDip = 0;            // landing camera dip offset
  private currentFov: number;        // current FOV (lerped for sprint)
  private isSprinting = false;
  private wasGrounded = true;        // for landing detection

  private readonly mouseSensitivity = 0.002;

  constructor(camera: THREE.PerspectiveCamera, input: InputManager, chunkManager: ChunkManager) {
    this.camera = camera;
    this.input = input;
    this.chunkManager = chunkManager;
    this.currentFov = FOV;
  }

  /** Spawn at a world position, adjusting Y to terrain height to avoid collision. */
  spawn(wx: number, wz: number, worldGenHeight: number): void {
    this.x = wx + 0.5; // Center the player in the block
    this.z = wz + 0.5;
    this.y = worldGenHeight;
    // Push player up until they don't collide
    while (this.collidesAt(this.x, this.y, this.z)) {
      this.y += 1;
      // Safety break to prevent infinite loops
      if (this.y > worldGenHeight + 20) break;
    }
  }

  update(dt: number): void {
    if (this.input.isPointerLocked) {
      this.handleMouse();
    }
    
    // Auto-unstick: if stuck inside terrain, push up until free.
    if (this.collidesAt(this.x, this.y, this.z)) {
      this.y += 20 * dt; // Float up at 20 units/sec
      this.velocityY = 0;
      this.updateCamera();
      return;
    }

    this.handleMovement(dt);
    this.handleGravity(dt);
    this.handleLandingDip(dt);
    this.updateCamera();
  }

  private handleMouse(): void {
    this.yaw -= this.input.mouseDX * this.mouseSensitivity;
    this.pitch -= this.input.mouseDY * this.mouseSensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  private handleMovement(dt: number): void {
    this.isSprinting = this.input.isKeyDown('shift');
    const targetSpeed = this.isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();

    if (this.input.isKeyDown('w')) move.add(forward);
    if (this.input.isKeyDown('s')) move.sub(forward);
    if (this.input.isKeyDown('a')) move.sub(right);
    if (this.input.isKeyDown('d')) move.add(right);

    const isMoving = move.lengthSq() > 0;

    // Acceleration ramp-up/down
    if (isMoving) {
      this.moveSpeed = Math.min(targetSpeed, this.moveSpeed + targetSpeed * (dt / ACCELERATION_TIME));
    } else {
      this.moveSpeed = Math.max(0, this.moveSpeed - targetSpeed * (dt / ACCELERATION_TIME) * 3); // decelerate faster
    }

    if (isMoving && this.moveSpeed > 0) {
      const speed = this.moveSpeed * dt;
      move.normalize().multiplyScalar(speed);
      const nx = this.x + move.x;
      const nz = this.z + move.z;
      if (!this.collidesAt(nx, this.y, this.z)) this.x = nx;
      if (!this.collidesAt(this.x, this.y, nz)) this.z = nz;

      // Head bob
      const bobSpeed = this.isSprinting ? HEAD_BOB_SPEED * 1.3 : HEAD_BOB_SPEED;
      this.bobPhase += dt * bobSpeed;
    } else {
      // Decay bob smoothly
      this.bobPhase *= 0.9;
    }

    if (this.input.isKeyDown(' ') && this.isGrounded) {
      this.velocityY = JUMP_FORCE;
      this.isGrounded = false;
    }

    // Sprint FOV lerp
    const targetFov = this.isSprinting && isMoving ? FOV + SPRINT_FOV_BOOST : FOV;
    this.currentFov += (targetFov - this.currentFov) * Math.min(1, dt * 8);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
  }

  private handleGravity(dt: number): void {
    this.wasGrounded = this.isGrounded;
    this.velocityY += GRAVITY * dt;
    if (this.velocityY < TERMINAL_VELOCITY) this.velocityY = TERMINAL_VELOCITY;
    const ny = this.y + this.velocityY * dt;
    if (this.collidesAt(this.x, ny, this.z)) {
      if (this.velocityY < 0) this.isGrounded = true;
      this.velocityY = 0;
    } else {
      this.y = ny;
      this.isGrounded = false;
    }
  }

  private handleLandingDip(dt: number): void {
    // Trigger landing dip when transitioning from air to ground
    if (this.isGrounded && !this.wasGrounded) {
      // Calculate fall damage: > 4 blocks fall = (fallBlocks - 3) * 5 HP
      const fallDist = this.highestY - this.y;
      if (fallDist > 4) {
        this.lastFallDamage = Math.floor((fallDist - 3) * 5);
        eventBus.emit('player:fall_damage', { damage: this.lastFallDamage });
      }
      this.landingDip = LANDING_DIP_AMOUNT;
      this.highestY = this.y;
    }
    // Track highest point while airborne
    if (!this.isGrounded && this.y > this.highestY) {
      this.highestY = this.y;
    }
    // Recover from dip
    if (this.landingDip > 0) {
      this.landingDip = Math.max(0, this.landingDip - LANDING_DIP_RECOVERY * dt);
    }
  }

  /** Pushes the player up if they are currently inside a block. */
  ensureSafePosition(): void {
    while (this.collidesAt(this.x, this.y, this.z)) {
      this.y += 1;
      if (this.y > 255) break;
    }
  }

  collidesAt(px: number, py: number, pz: number): boolean {
    const hw = PLAYER_WIDTH / 2;
    const offsets = [
      [px - hw, py, pz - hw], [px + hw, py, pz - hw],
      [px - hw, py, pz + hw], [px + hw, py, pz + hw],
      [px - hw, py + PLAYER_HEIGHT, pz - hw], [px + hw, py + PLAYER_HEIGHT, pz - hw],
      [px - hw, py + PLAYER_HEIGHT, pz + hw], [px + hw, py + PLAYER_HEIGHT, pz + hw],
    ];
    for (const [ox, oy, oz] of offsets) {
      const bx = Math.floor(ox), by = Math.floor(oy), bz = Math.floor(oz);
      const block = this.chunkManager.getBlockAtWorld(bx, by, bz);
      if (isBlockSolid(block as number)) return true;
    }
    return false;
  }

  private updateCamera(): void {
    // Head bob offsets
    const bobY = Math.sin(this.bobPhase) * HEAD_BOB_AMOUNT * (this.moveSpeed / PLAYER_SPEED);
    const bobX = Math.cos(this.bobPhase * 0.5) * HEAD_BOB_SWAY * (this.moveSpeed / PLAYER_SPEED);

    this.camera.position.set(
      this.x + bobX,
      this.y + PLAYER_EYE_HEIGHT + bobY - this.landingDip,
      this.z,
    );
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  /** Get forward-facing direction */
  getForward(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /** Get look direction including pitch */
  getLookDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    ).normalize();
  }
}
