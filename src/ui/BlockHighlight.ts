/**
 * BlockHighlight — Shows an outline on the block the player is looking at.
 * Also renders a mining progress bar when breaking blocks.
 */

import * as THREE from 'three';

export class BlockHighlight {
  private wireframe: THREE.LineSegments;
  private scene: THREE.Scene;
  private progressBar: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private _miningProgress = 0;
  visible = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Wireframe cube
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005));
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.6 });
    this.wireframe = new THREE.LineSegments(edges, mat);
    this.wireframe.visible = false;
    scene.add(this.wireframe);

    // Mining progress bar (HTML overlay)
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = 'position:fixed;top:55%;left:50%;transform:translateX(-50%);width:120px;height:6px;background:rgba(0,0,0,0.6);border-radius:3px;z-index:110;display:none;';
    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#e67e22,#f1c40f);border-radius:3px;width:0%;transition:width 0.05s;';
    this.progressBar.appendChild(this.progressFill);
    document.body.appendChild(this.progressBar);
  }

  /** Position the highlight at a block coordinate. */
  setPosition(x: number, y: number, z: number): void {
    this.wireframe.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.wireframe.visible = true;
    this.visible = true;
  }

  hide(): void {
    this.wireframe.visible = false;
    this.visible = false;
    this.hideMiningProgress();
  }

  /** Update mining progress bar (0 to 1). */
  setMiningProgress(progress: number): void {
    this._miningProgress = Math.max(0, Math.min(1, progress));
    if (this._miningProgress > 0) {
      this.progressBar.style.display = 'block';
      this.progressFill.style.width = `${this._miningProgress * 100}%`;
    } else {
      this.hideMiningProgress();
    }
  }

  hideMiningProgress(): void {
    this._miningProgress = 0;
    this.progressBar.style.display = 'none';
    this.progressFill.style.width = '0%';
  }

  get miningProgress(): number { return this._miningProgress; }

  destroy(): void {
    this.scene.remove(this.wireframe);
    this.wireframe.geometry.dispose();
    (this.wireframe.material as THREE.Material).dispose();
    this.progressBar.remove();
  }
}
