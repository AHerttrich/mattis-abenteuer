/**
 * PauseMenu — ESC-triggered overlay with resume, save, load, settings, and quit.
 */

import { soundManager } from '../engine/SoundManager';

export class PauseMenu {
  private overlay: HTMLDivElement;
  private _visible = false;
  private onResume: (() => void) | null = null;
  private onSave: (() => void) | null = null;
  private onLoad: (() => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'pause-menu';
    this.overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:400;display:none;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;';

    const panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(30,30,30,0.95);border:2px solid rgba(255,255,255,0.15);border-radius:12px;padding:30px 50px;text-align:center;backdrop-filter:blur(10px);';

    // Title
    const title = document.createElement('h1');
    title.style.cssText = 'color:#f1c40f;font-size:32px;margin:0 0 25px;';
    title.textContent = '⏸ Paused';
    panel.appendChild(title);

    // Buttons
    const buttons: { label: string; icon: string; action: () => void; color: string }[] = [
      { label: 'Resume', icon: '▶️', action: () => this.hide(), color: '#2ecc71' },
      { label: 'Save Game', icon: '💾', action: () => this.onSave?.(), color: '#3498db' },
      { label: 'Load Game', icon: '📂', action: () => this.onLoad?.(), color: '#3498db' },
    ];

    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.style.cssText = `display:block;width:100%;padding:12px;margin:6px 0;background:rgba(255,255,255,0.08);border:1px solid ${b.color}44;color:#fff;font-family:monospace;font-size:16px;border-radius:8px;cursor:pointer;transition:all 0.2s;pointer-events:auto;`;
      btn.textContent = `${b.icon}  ${b.label}`;
      btn.addEventListener('click', b.action);
      btn.addEventListener('mouseenter', () => { btn.style.background = `${b.color}33`; btn.style.borderColor = b.color; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.08)'; btn.style.borderColor = `${b.color}44`; });
      panel.appendChild(btn);
    }

    // Sound volume slider
    const volDiv = document.createElement('div');
    volDiv.style.cssText = 'margin-top:20px;padding-top:15px;border-top:1px solid rgba(255,255,255,0.1);';
    volDiv.innerHTML = '<div style="color:#bdc3c7;font-size:13px;margin-bottom:6px;">🔊 Volume</div>';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '30';
    slider.style.cssText = 'width:100%;pointer-events:auto;accent-color:#f1c40f;';
    slider.addEventListener('input', () => {
      soundManager.setVolume(parseInt(slider.value) / 100);
    });
    volDiv.appendChild(slider);
    panel.appendChild(volDiv);

    // Sound toggle
    const soundBtn = document.createElement('button');
    soundBtn.style.cssText = 'display:block;width:100%;padding:8px;margin:8px 0 0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#7f8c8d;font-family:monospace;font-size:13px;border-radius:6px;cursor:pointer;pointer-events:auto;';
    soundBtn.textContent = soundManager.isEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    soundBtn.addEventListener('click', () => {
      soundManager.toggle();
      soundBtn.textContent = soundManager.isEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    });
    panel.appendChild(soundBtn);

    // Hint
    const hint = document.createElement('div');
    hint.style.cssText = 'color:#7f8c8d;font-size:12px;margin-top:15px;';
    hint.textContent = 'ESC to resume';
    panel.appendChild(hint);

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);
  }

  show(): void {
    this._visible = true;
    this.overlay.style.display = 'flex';
    document.exitPointerLock();
  }

  hide(): void {
    this._visible = false;
    this.overlay.style.display = 'none';
    this.onResume?.();
  }

  toggle(): void {
    if (this._visible) this.hide();
    else this.show();
  }

  setCallbacks(onResume: () => void, onSave: () => void, onLoad: () => void): void {
    this.onResume = onResume;
    this.onLoad = onLoad;
    this.onSave = onSave;
  }

  get isVisible(): boolean { return this._visible; }
  destroy(): void { this.overlay.remove(); }
}
