/**
 * HUD — In-game heads-up display rendered as HTML overlay.
 */

import { getItemIcon, getItemTierColor } from './ItemIcons';

export class HUD {
  private container: HTMLDivElement;
  private crosshair!: HTMLDivElement;
  private healthBar!: HTMLDivElement;
  private healthText!: HTMLSpanElement;
  private hungerBar!: HTMLDivElement;
  private hungerText!: HTMLSpanElement;
  private hotbar!: HTMLDivElement;
  private debugInfo!: HTMLDivElement;
  private infoText!: HTMLDivElement;
  private damageFlash!: HTMLDivElement;
  private lowHpOverlay!: HTMLDivElement;
  private lowHpActive = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;font-family:monospace;color:#fff;';
    this.createCrosshair();
    this.createHealthBar();
    this.createHungerBar();
    this.createHotbar();
    this.createDebugInfo();
    this.createInfoText();
    this.createDamageFlash();
    this.createLowHpOverlay();
    document.body.appendChild(this.container);
  }

  private createCrosshair(): void {
    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;';
    this.crosshair.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><line x1="12" y1="4" x2="12" y2="10" stroke="white" stroke-width="2"/><line x1="12" y1="14" x2="12" y2="20" stroke="white" stroke-width="2"/><line x1="4" y1="12" x2="10" y2="12" stroke="white" stroke-width="2"/><line x1="14" y1="12" x2="20" y2="12" stroke="white" stroke-width="2"/></svg>`;
    this.container.appendChild(this.crosshair);
  }

  private createHealthBar(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center;';
    const healthWrap = document.createElement('div');
    healthWrap.style.cssText =
      'width:145px;background:rgba(0,0,0,0.6);border-radius:6px;padding:4px;position:relative;';
    const heartIcon = document.createElement('span');
    heartIcon.style.cssText = 'position:absolute;top:-1px;left:6px;font-size:10px;';
    heartIcon.textContent = '❤️';
    this.healthBar = document.createElement('div');
    this.healthBar.style.cssText =
      'height:12px;background:linear-gradient(90deg,#e74c3c,#e67e22);border-radius:4px;width:100%;transition:width 0.3s;';
    this.healthText = document.createElement('span');
    this.healthText.style.cssText =
      'position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:10px;text-shadow:1px 1px 2px #000;';
    this.healthText.textContent = '100/100';
    healthWrap.appendChild(heartIcon);
    healthWrap.appendChild(this.healthBar);
    healthWrap.appendChild(this.healthText);
    wrapper.appendChild(healthWrap);
    this.container.appendChild(wrapper);
  }

  private createHungerBar(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);margin-left:155px;';
    const hungerWrap = document.createElement('div');
    hungerWrap.style.cssText =
      'width:145px;background:rgba(0,0,0,0.6);border-radius:6px;padding:4px;position:relative;';
    const drumstickIcon = document.createElement('span');
    drumstickIcon.style.cssText = 'position:absolute;top:-1px;left:6px;font-size:10px;';
    drumstickIcon.textContent = '🍖';
    this.hungerBar = document.createElement('div');
    this.hungerBar.style.cssText =
      'height:12px;background:linear-gradient(90deg,#d4a056,#c0792a);border-radius:4px;width:100%;transition:width 0.3s,background 0.3s;';
    this.hungerText = document.createElement('span');
    this.hungerText.style.cssText =
      'position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:10px;text-shadow:1px 1px 2px #000;';
    this.hungerText.textContent = '20/20';
    hungerWrap.appendChild(drumstickIcon);
    hungerWrap.appendChild(this.hungerBar);
    hungerWrap.appendChild(this.hungerText);
    wrapper.appendChild(hungerWrap);
    this.container.appendChild(wrapper);
  }

  private createHotbar(): void {
    this.hotbar = document.createElement('div');
    this.hotbar.style.cssText =
      'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;';
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.id = `hotbar-${i}`;
      slot.style.cssText =
        'width:44px;height:44px;background:rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.3);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;';
      const num = document.createElement('span');
      num.style.cssText = 'position:absolute;top:1px;left:3px;font-size:8px;opacity:0.7;';
      num.textContent = `${i + 1}`;
      slot.appendChild(num);
      this.hotbar.appendChild(slot);
    }
    this.container.appendChild(this.hotbar);
  }

  private createDebugInfo(): void {
    this.debugInfo = document.createElement('div');
    this.debugInfo.style.cssText =
      'position:absolute;top:10px;left:10px;font-size:12px;text-shadow:1px 1px 2px #000;line-height:1.6;';
    this.container.appendChild(this.debugInfo);
  }

  private createInfoText(): void {
    this.infoText = document.createElement('div');
    this.infoText.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-80px);font-size:18px;text-shadow:2px 2px 4px #000;text-align:center;opacity:0;transition:opacity 0.5s;';
    this.container.appendChild(this.infoText);
  }

  private createDamageFlash(): void {
    this.damageFlash = document.createElement('div');
    this.damageFlash.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99;opacity:0;transition:opacity 0.08s;background:radial-gradient(ellipse at center, transparent 40%, rgba(200,0,0,0.4) 100%);';
    document.body.appendChild(this.damageFlash);
  }

  private createLowHpOverlay(): void {
    this.lowHpOverlay = document.createElement('div');
    this.lowHpOverlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:98;opacity:0;box-sizing:border-box;';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes hud-heartbeat {
        0%, 100% { opacity: 0.3; }
        25% { opacity: 0.7; }
        35% { opacity: 0.3; }
        50% { opacity: 0.6; }
        60% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.lowHpOverlay);
  }

  /** Flash red vignette when taking damage. */
  flashDamage(): void {
    this.damageFlash.style.opacity = '1';
    setTimeout(() => {
      this.damageFlash.style.opacity = '0';
    }, 150);
  }

  updateHealth(current: number, max: number): void {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    this.healthBar.style.width = `${pct}%`;
    this.healthText.textContent = `${Math.round(current)}/${max}`;
    this.healthBar.style.background =
      pct > 50
        ? 'linear-gradient(90deg,#27ae60,#2ecc71)'
        : pct > 25
          ? 'linear-gradient(90deg,#e67e22,#f39c12)'
          : 'linear-gradient(90deg,#c0392b,#e74c3c)';

    // Low HP heartbeat
    if (pct <= 20 && !this.lowHpActive) {
      this.lowHpActive = true;
      this.lowHpOverlay.style.animation = 'hud-heartbeat 1.2s ease-in-out infinite';
      this.lowHpOverlay.style.opacity = '1';
      this.lowHpOverlay.style.background =
        'radial-gradient(ellipse at center, transparent 50%, rgba(180,0,0,0.35) 100%)';
    } else if (pct > 20 && this.lowHpActive) {
      this.lowHpActive = false;
      this.lowHpOverlay.style.animation = '';
      this.lowHpOverlay.style.opacity = '0';
      this.lowHpOverlay.style.background = 'none';
    }
  }

  updateHunger(current: number, max: number): void {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    this.hungerBar.style.width = `${pct}%`;
    this.hungerText.textContent = `${Math.round(current)}/${max}`;
    this.hungerBar.style.background =
      pct > 50
        ? 'linear-gradient(90deg,#d4a056,#c0792a)'
        : pct > 25
          ? 'linear-gradient(90deg,#c97a2a,#b06820)'
          : 'linear-gradient(90deg,#a04010,#802000)';
  }

  updateHotbar(
    items: ({
      name: string;
      count: number;
      itemId?: string;
      durability?: number;
      maxDurability?: number;
    } | null)[],
    selected: number,
  ): void {
    for (let i = 0; i < 9; i++) {
      const slot = document.getElementById(`hotbar-${i}`);
      if (!slot) continue;
      const item = items[i];

      // Tier-colored border for selected + item tier
      const tierBorder = item?.itemId ? getItemTierColor(item.itemId) : 'rgba(255,255,255,0.3)';
      slot.style.borderColor = i === selected ? '#f1c40f' : tierBorder;

      const existing = slot.querySelector('.item-label');
      if (existing) existing.remove();
      const existingBar = slot.querySelector('.durability-bar');
      if (existingBar) existingBar.remove();

      if (item) {
        const icon = item.itemId ? getItemIcon(item.itemId) : '📦';
        const label = document.createElement('div');
        label.className = 'item-label';
        label.style.cssText =
          'display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;position:relative;';
        // Emoji icon
        const iconSpan = document.createElement('span');
        iconSpan.style.cssText =
          'font-size:20px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));';
        iconSpan.textContent = icon;
        label.appendChild(iconSpan);
        // Count badge
        if (item.count > 1) {
          const countBadge = document.createElement('span');
          countBadge.style.cssText =
            'position:absolute;bottom:1px;right:2px;font-size:10px;font-weight:bold;text-shadow:1px 1px 2px #000;';
          countBadge.textContent = `${item.count}`;
          label.appendChild(countBadge);
        }
        slot.appendChild(label);

        if (item.durability !== undefined && item.maxDurability) {
          const pct = Math.max(0, Math.min(100, (item.durability / item.maxDurability) * 100));
          const color = pct > 50 ? '#2ecc71' : pct > 20 ? '#f1c40f' : '#e74c3c';
          const barWrap = document.createElement('div');
          barWrap.className = 'durability-bar';
          barWrap.style.cssText =
            'position:absolute;bottom:2px;left:4px;right:4px;height:4px;background:rgba(0,0,0,0.5);border-radius:1px;';
          const barFill = document.createElement('div');
          barFill.style.cssText = `height:100%;width:${pct}%;background:${color};border-radius:1px;transition:width 0.2s, background 0.2s;`;
          barWrap.appendChild(barFill);
          slot.appendChild(barWrap);
        }
      }
    }
  }

  updateDebug(
    fps: number,
    x: number,
    y: number,
    z: number,
    chunks: number,
    biome?: string,
    time?: string,
    warriors?: number,
  ): void {
    let text = `FPS: ${fps}<br>X: ${x.toFixed(1)} Y: ${y.toFixed(1)} Z: ${z.toFixed(1)}<br>Chunks: ${chunks}`;
    if (biome) text += `<br>${biome}`;
    if (time) text += ` | 🕐 ${time}`;
    if (warriors !== undefined) text += `<br>⚔️ Warriors: ${warriors}`;
    this.debugInfo.innerHTML = text;
  }

  showInfo(text: string, durationMs = 3000): void {
    this.infoText.textContent = text;
    this.infoText.style.opacity = '1';
    setTimeout(() => {
      this.infoText.style.opacity = '0';
    }, durationMs);
  }

  showStartScreen(): void {
    const overlay = document.createElement('div');
    overlay.id = 'start-screen';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:200;cursor:pointer;pointer-events:auto;overflow:hidden;';
    overlay.innerHTML = `
      <style>
        @keyframes startBg { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes titleGlow { 0%,100%{text-shadow:0 0 20px rgba(241,196,15,0.4),0 0 40px rgba(241,196,15,0.2),3px 3px 6px #000;} 50%{text-shadow:0 0 30px rgba(241,196,15,0.8),0 0 60px rgba(241,196,15,0.4),3px 3px 6px #000;} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes particle { 0%{opacity:0;transform:translateY(0) scale(0)} 20%{opacity:1;transform:translateY(-20px) scale(1)} 100%{opacity:0;transform:translateY(-80px) scale(0.3)} }
        @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.02)} }
        .start-particle { position:absolute; width:4px; height:4px; background:radial-gradient(circle,rgba(241,196,15,0.8),transparent); border-radius:50%; animation:particle 3s infinite; }
      </style>
      <div style="position:absolute;inset:0;background:linear-gradient(-45deg,#0a0a2e,#1a0a2e,#0a1a2e,#0a0a1e);background-size:400% 400%;animation:startBg 12s ease infinite;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.6) 100%);"></div>
      ${Array.from({ length: 20 }, (_, i) => `<div class="start-particle" style="left:${10 + Math.random() * 80}%;top:${20 + Math.random() * 60}%;animation-delay:${i * 0.15}s;animation-duration:${2 + Math.random() * 2}s;"></div>`).join('')}
      <h1 style="position:relative;font-size:52px;color:#f1c40f;animation:titleGlow 3s ease-in-out infinite;margin-bottom:8px;font-family:'Georgia',serif;letter-spacing:2px;">⚔️ Mattis Abenteuer ⚔️</h1>
      <p style="position:relative;font-size:16px;color:#8e8ea0;margin-bottom:50px;letter-spacing:4px;text-transform:uppercase;animation:fadeUp 1s 0.3s both;">Voxel Castle Warfare</p>
      <p style="position:relative;font-size:22px;color:#fff;animation:pulse2 2.5s infinite;cursor:pointer;">▶ Click to Play</p>
      <div style="position:relative;margin-top:50px;font-size:13px;color:rgba(255,255,255,0.4);text-align:center;line-height:2.2;animation:fadeUp 1s 0.6s both;">
        <span style="color:rgba(255,255,255,0.6)">WASD</span> Move &nbsp;·&nbsp; <span style="color:rgba(255,255,255,0.6)">Mouse</span> Look &nbsp;·&nbsp; <span style="color:rgba(255,255,255,0.6)">Space</span> Jump<br>
        <span style="color:rgba(255,255,255,0.6)">LMB</span> Break &nbsp;·&nbsp; <span style="color:rgba(255,255,255,0.6)">RMB</span> Place &nbsp;·&nbsp; <span style="color:rgba(255,255,255,0.6)">1-9</span> Hotbar<br>
        <span style="color:rgba(255,255,255,0.6)">C</span> Craft &nbsp;·&nbsp; <span style="color:rgba(255,255,255,0.6)">B</span> Build Castle &nbsp;·&nbsp; <span style="color:rgba(255,255,255,0.6)">I</span> Inventory
      </div>
      <div style="position:absolute;bottom:16px;font-size:11px;color:rgba(255,255,255,0.2);animation:fadeUp 1s 1s both;">v0.1.0 · Three.js Voxel Engine</div>
    `;
    overlay.addEventListener(
      'click',
      () => {
        overlay.style.transition = 'opacity 0.4s';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          const canvas = document.querySelector('canvas');
          if (canvas) canvas.requestPointerLock();
        }, 400);
      },
      { once: true },
    );
    document.body.appendChild(overlay);
  }

  /** WS11: Update crosshair appearance based on context */
  updateCrosshair(state: 'default' | 'target' | 'attack' | 'interact'): void {
    const colors: Record<string, string> = {
      default: 'white',
      target: '#f1c40f',
      attack: '#e74c3c',
      interact: '#2ecc71',
    };
    const sizes: Record<string, number> = {
      default: 24,
      target: 28,
      attack: 26,
      interact: 28,
    };
    const color = colors[state];
    const size = sizes[state];
    this.crosshair.style.width = `${size}px`;
    this.crosshair.style.height = `${size}px`;
    const dot = state === 'attack' ? `<circle cx="12" cy="12" r="2" fill="${color}"/>` : '';
    this.crosshair.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><line x1="12" y1="4" x2="12" y2="10" stroke="${color}" stroke-width="2"/><line x1="12" y1="14" x2="12" y2="20" stroke="${color}" stroke-width="2"/><line x1="4" y1="12" x2="10" y2="12" stroke="${color}" stroke-width="2"/><line x1="14" y1="12" x2="20" y2="12" stroke="${color}" stroke-width="2"/>${dot}</svg>`;
    this.crosshair.style.transition = 'width 0.1s, height 0.1s';
  }

  /** WS12: Underwater overlay */
  private underwaterOverlay: HTMLDivElement | null = null;
  setUnderwaterOverlay(active: boolean): void {
    if (active && !this.underwaterOverlay) {
      this.underwaterOverlay = document.createElement('div');
      this.underwaterOverlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:95;background:radial-gradient(ellipse at center,rgba(30,60,120,0.3) 0%,rgba(10,30,80,0.5) 100%);transition:opacity 0.5s;';
      document.body.appendChild(this.underwaterOverlay);
    } else if (!active && this.underwaterOverlay) {
      this.underwaterOverlay.remove();
      this.underwaterOverlay = null;
    }
  }

  // ── Wave Display ─────────────────────────────────────────
  private waveDisplay: HTMLDivElement | null = null;
  private waveBanner: HTMLDivElement | null = null;

  updateWave(waveNumber: number, phase: string, timer: number, enemiesAlive: number): void {
    if (!this.waveDisplay) {
      this.waveDisplay = document.createElement('div');
      this.waveDisplay.style.cssText =
        'position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.6);padding:8px 14px;border-radius:6px;font-size:13px;text-align:right;pointer-events:none;z-index:102;';
      this.container.appendChild(this.waveDisplay);
    }
    if (phase === 'active') {
      this.waveDisplay.innerHTML = `⚔️ <span style="color:#e74c3c;font-weight:bold;">WAVE ${waveNumber}</span> — ${enemiesAlive} enemies remaining`;
    } else if (phase === 'warning') {
      this.waveDisplay.innerHTML = `⚠️ <span style="color:#f1c40f;font-weight:bold;">WAVE ${waveNumber}</span> incoming in ${timer}s`;
    } else {
      this.waveDisplay.innerHTML = `🏰 <span style="color:#2ecc71;">Peace</span> — Next wave in ${timer}s`;
    }
  }

  showWaveBanner(text: string, color: string = '#f1c40f', duration: number = 3000): void {
    if (this.waveBanner) this.waveBanner.remove();
    this.waveBanner = document.createElement('div');
    this.waveBanner.style.cssText = `position:absolute;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);padding:12px 32px;border-radius:8px;font-size:20px;font-weight:bold;color:${color};letter-spacing:2px;pointer-events:none;z-index:110;border:2px solid ${color};text-align:center;`;
    this.waveBanner.textContent = text;
    this.container.appendChild(this.waveBanner);
    setTimeout(() => {
      if (this.waveBanner) {
        this.waveBanner.remove();
        this.waveBanner = null;
      }
    }, duration);
  }

  destroy(): void {
    this.container.remove();
  }
}
