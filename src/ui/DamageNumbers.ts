import * as THREE from 'three';
import { eventBus, Events } from '../utils';

interface FloatingNumber {
  element: HTMLDivElement;
  worldPos: THREE.Vector3;
  age: number;
}

export class DamageNumbers {
  private container: HTMLDivElement;
  private camera: THREE.Camera;
  private numbers: FloatingNumber[] = [];

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.container = document.createElement('div');
    this.container.id = 'damage-numbers';
    this.container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;overflow:hidden;';
    document.body.appendChild(this.container);

    eventBus.on(Events.ENTITY_DAMAGED, (data: any) => {
      const { damage, pos } = data;
      if (pos) {
        this.addNumber(damage, pos.x, pos.y + 1.5, pos.z, '#ff3333');
      }
    });

    eventBus.on(Events.PLAYER_ATTACKED, (data: any) => {
      const { damage, pos } = data;
      if (pos) {
        this.addNumber(damage, pos.x, pos.y + 1.5, pos.z, '#ff3333');
      }
    });
  }

  addNumber(amount: number, x: number, y: number, z: number, color = '#ffffff'): void {
    const el = document.createElement('div');
    el.textContent = `-${amount}`;
    el.style.cssText = `position:absolute;font-family:monospace;font-size:24px;font-weight:bold;color:${color};text-shadow:2px 2px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;transform:translate(-50%,-50%);opacity:1;transition:none;`;
    
    // Slight random offset
    const offset = new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
    
    this.container.appendChild(el);
    this.numbers.push({
      element: el,
      worldPos: new THREE.Vector3(x, y, z).add(offset),
      age: 0
    });
  }

  update(dt: number): void {
    const v = new THREE.Vector3();
    const w = window.innerWidth, h = window.innerHeight;

    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const num = this.numbers[i];
      num.age += dt;

      // Float up
      num.worldPos.y += dt;

      if (num.age > 1.5) {
        num.element.remove();
        this.numbers.splice(i, 1);
        continue;
      }

      // Project 3D to 2D
      v.copy(num.worldPos).project(this.camera);

      // Only show if in front of camera
      if (v.z < 1) {
        const x = (v.x * 0.5 + 0.5) * w;
        const y = -(v.y * 0.5 - 0.5) * h;
        num.element.style.left = `${x}px`;
        num.element.style.top = `${y}px`;
        // Fade out
        const opacity = Math.max(0, 1.0 - (num.age / 1.5));
        num.element.style.opacity = opacity.toString();
        num.element.style.display = 'block';
      } else {
        num.element.style.display = 'none';
      }
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
