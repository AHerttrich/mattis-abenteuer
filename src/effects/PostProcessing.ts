/**
 * PostProcessing — Three.js post-processing pipeline.
 *
 * Adds bloom (for glowing torches/lava/crystals), ACES filmic tone mapping,
 * and an output pass. Wraps EffectComposer for easy integration.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostProcessingPipeline {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    // Enable ACES Filmic tone mapping for richer, more cinematic colors
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    this.composer = new EffectComposer(renderer);

    // 1. Render the scene
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. Bloom — subtle glow on bright surfaces (torches, lava, crystals, sun)
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.3, 0.4, 0.85);
    //                                                strength, radius, threshold
    this.composer.addPass(this.bloomPass);

    // 3. Output pass (gamma correction + tone mapping application)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  /** Call this instead of renderer.render(scene, camera). */
  render(): void {
    this.composer.render();
  }

  /** Must be called on window resize. */
  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  /** Adjust bloom intensity (e.g. for night = stronger bloom). */
  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength;
  }

  destroy(): void {
    this.composer.dispose();
  }
}
