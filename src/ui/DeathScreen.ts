/**
 * DeathScreen — Displayed when the player dies with stats and respawn button.
 */

export class DeathScreen {
  private overlay: HTMLDivElement;
  private _visible = false;
  private onRespawn: (() => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'death-screen';
    this.overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(100,0,0,0.7);z-index:500;display:none;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;';

    const panel = document.createElement('div');
    panel.style.cssText = 'text-align:center;';
    panel.innerHTML = `
      <h1 style="color:#e74c3c;font-size:64px;text-shadow:3px 3px 6px #000;margin-bottom:10px;">💀 You Died</h1>
      <div id="death-stats" style="color:#bdc3c7;font-size:16px;line-height:2;margin:20px 0;"></div>
    `;

    const respawnBtn = document.createElement('button');
    respawnBtn.textContent = '⟳  Respawn';
    respawnBtn.style.cssText =
      'background:linear-gradient(135deg,#c0392b,#e74c3c);border:none;color:#fff;padding:14px 40px;font-size:20px;border-radius:8px;cursor:pointer;font-family:monospace;transition:transform 0.2s;pointer-events:auto;';
    respawnBtn.addEventListener('click', () => {
      this.hide();
      this.onRespawn?.();
    });
    respawnBtn.addEventListener('mouseenter', () => {
      respawnBtn.style.transform = 'scale(1.05)';
    });
    respawnBtn.addEventListener('mouseleave', () => {
      respawnBtn.style.transform = 'scale(1)';
    });
    panel.appendChild(respawnBtn);

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);
  }

  show(stats: {
    blocksMined: number;
    enemiesKilled: number;
    timePlayed: number;
    cause: string;
  }): void {
    this._visible = true;
    this.overlay.style.display = 'flex';
    document.exitPointerLock();

    const minutes = Math.floor(stats.timePlayed / 60);
    const seconds = Math.floor(stats.timePlayed % 60);

    const statsEl = document.getElementById('death-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        Cause: <span style="color:#e74c3c;">${stats.cause}</span><br>
        ⛏️ Blocks Mined: ${stats.blocksMined}<br>
        ⚔️ Enemies Defeated: ${stats.enemiesKilled}<br>
        ⏱️ Time Survived: ${minutes}m ${seconds}s
      `;
    }
  }

  hide(): void {
    this._visible = false;
    this.overlay.style.display = 'none';
  }

  setRespawnCallback(cb: () => void): void {
    this.onRespawn = cb;
  }

  get isVisible(): boolean {
    return this._visible;
  }
  destroy(): void {
    this.overlay.remove();
  }
}
