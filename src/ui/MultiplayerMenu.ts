/**
 * MultiplayerMenu — Host/Join UI overlay for peer-to-peer multiplayer.
 */

import { NetworkManager } from '../network/NetworkManager';

export class MultiplayerMenu {
  private container: HTMLDivElement;
  private networkManager: NetworkManager;
  private _isVisible = false;
  private onConnectedCallback: (() => void) | null = null;

  get isVisible(): boolean { return this._isVisible; }

  constructor(networkManager: NetworkManager) {
    this.networkManager = networkManager;

    this.container = document.createElement('div');
    this.container.id = 'multiplayer-menu';
    this.container.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);
      z-index:400;display:none;
      font-family:'Segoe UI',sans-serif;color:#fff;
      justify-content:center;align-items:center;
    `;
    this.container.innerHTML = this.buildHTML();
    document.body.appendChild(this.container);

    // Wire buttons
    this.container.querySelector('#mp-host-btn')!.addEventListener('click', () => this.doHost());
    this.container.querySelector('#mp-join-btn')!.addEventListener('click', () => this.doJoin());
    this.container.querySelector('#mp-close-btn')!.addEventListener('click', () => this.hide());
    this.container.querySelector('#mp-disconnect-btn')!.addEventListener('click', () => this.doDisconnect());

    // Status updates
    this.networkManager.onStatus((status, info) => {
      const statusEl = this.container.querySelector('#mp-status') as HTMLDivElement;
      if (status === 'connected') {
        statusEl.textContent = '🟢 Connected!';
        statusEl.style.color = '#2ecc71';
        (this.container.querySelector('#mp-disconnect-btn') as HTMLElement).style.display = 'inline-block';
        if (this.onConnectedCallback) this.onConnectedCallback();
        setTimeout(() => this.hide(), 1500);
      } else if (status === 'disconnected') {
        statusEl.textContent = '🔴 Disconnected';
        statusEl.style.color = '#e74c3c';
        (this.container.querySelector('#mp-disconnect-btn') as HTMLElement).style.display = 'none';
      } else if (status === 'error') {
        statusEl.textContent = `❌ Error: ${info}`;
        statusEl.style.color = '#e74c3c';
      }
    });
  }

  setConnectedCallback(cb: () => void): void {
    this.onConnectedCallback = cb;
  }

  show(): void {
    this._isVisible = true;
    this.container.style.display = 'flex';
    document.exitPointerLock();
  }

  hide(): void {
    this._isVisible = false;
    this.container.style.display = 'none';
  }

  toggle(): void {
    if (this._isVisible) this.hide();
    else this.show();
  }

  private async doHost(): Promise<void> {
    const statusEl = this.container.querySelector('#mp-status') as HTMLDivElement;
    const codeEl = this.container.querySelector('#mp-room-code') as HTMLDivElement;
    const lanEl = this.container.querySelector('#mp-lan-url') as HTMLDivElement;
    statusEl.textContent = '⏳ Creating room…';
    statusEl.style.color = '#f1c40f';

    try {
      const code = await this.networkManager.host();
      codeEl.textContent = code;
      codeEl.style.display = 'block';
      // Show LAN URL for Player 2
      const lanUrl = `http://${window.location.hostname}:${window.location.port || '3000'}`;
      lanEl.textContent = `Player 2 open: ${lanUrl}`;
      lanEl.style.display = 'block';
      statusEl.textContent = '⏳ Waiting for player to join…';
    } catch {
      statusEl.textContent = '❌ Failed to create room';
      statusEl.style.color = '#e74c3c';
    }
  }

  private async doJoin(): Promise<void> {
    const input = this.container.querySelector('#mp-code-input') as HTMLInputElement;
    const code = input.value.trim().toUpperCase();
    if (code.length < 4) return;

    const statusEl = this.container.querySelector('#mp-status') as HTMLDivElement;
    statusEl.textContent = '⏳ Connecting…';
    statusEl.style.color = '#f1c40f';

    try {
      await this.networkManager.join(code);
    } catch {
      statusEl.textContent = '❌ Failed to connect';
      statusEl.style.color = '#e74c3c';
    }
  }

  private doDisconnect(): void {
    this.networkManager.disconnect();
  }

  private buildHTML(): string {
    return `
      <div style="background:rgba(30,30,50,0.85);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:40px;text-align:center;min-width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <h2 style="margin:0 0 20px 0;font-size:28px;background:linear-gradient(135deg,#3498db,#9b59b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">⚔️ Multiplayer</h2>

        <div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px;">
          <button id="mp-host-btn" style="padding:12px 24px;border:none;border-radius:8px;background:linear-gradient(135deg,#2ecc71,#27ae60);color:#fff;font-size:16px;font-weight:bold;cursor:pointer;transition:transform .1s;">🏰 Host Game</button>
          <button id="mp-close-btn" style="padding:12px 16px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:transparent;color:#aaa;font-size:14px;cursor:pointer;">✕ Close</button>
        </div>

        <div id="mp-room-code" style="display:none;font-size:42px;letter-spacing:8px;font-family:monospace;color:#f1c40f;margin:16px 0;text-shadow:0 0 10px rgba(241,196,15,0.5);"></div>
        <div id="mp-lan-url" style="display:none;font-size:13px;color:#aaa;font-family:monospace;margin-bottom:8px;background:rgba(255,255,255,0.05);padding:4px 12px;border-radius:6px;"></div>

        <div style="margin:16px 0;border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;">
          <p style="margin:0 0 8px 0;font-size:14px;color:#aaa;">Or join a friend:</p>
          <div style="display:flex;gap:8px;justify-content:center;">
            <input id="mp-code-input" type="text" maxlength="6" placeholder="ROOM CODE" style="padding:10px 16px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;font-size:18px;font-family:monospace;text-align:center;letter-spacing:4px;width:160px;outline:none;" />
            <button id="mp-join-btn" style="padding:10px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#3498db,#2980b9);color:#fff;font-size:16px;font-weight:bold;cursor:pointer;">Join</button>
          </div>
        </div>

        <div id="mp-status" style="margin-top:16px;font-size:14px;color:#7f8c8d;min-height:20px;"></div>
        <button id="mp-disconnect-btn" style="display:none;margin-top:12px;padding:8px 16px;border:1px solid #e74c3c;border-radius:8px;background:transparent;color:#e74c3c;font-size:14px;cursor:pointer;">Disconnect</button>
      </div>
    `;
  }
}
