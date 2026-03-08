/**
 * ScoreDashboard — Two-column Player vs Enemy scoreboard.
 * Toggle with Tab key.
 */

import type { Castle } from '../castle/Castle';
import type { ECSWorld } from '../ecs';
import type { TeamComponent } from '../ecs/Component';
import type { Inventory } from '../crafting/Inventory';

export class ScoreDashboard {
  private container: HTMLDivElement;
  private playerCastle: Castle;
  private enemyCastle: Castle | null;
  private ecsWorld: ECSWorld;
  private inventory: Inventory;
  private _isVisible = false;

  get isVisible(): boolean { return this._isVisible; }

  constructor(playerCastle: Castle, enemyCastle: Castle | null, ecsWorld: ECSWorld, inventory: Inventory) {
    this.playerCastle = playerCastle;
    this.enemyCastle = enemyCastle;
    this.ecsWorld = ecsWorld;
    this.inventory = inventory;

    this.container = document.createElement('div');
    this.container.id = 'score-dashboard';
    this.container.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      font-family:'Segoe UI',sans-serif;color:#fff;z-index:350;
      background:rgba(10,10,30,0.88);backdrop-filter:blur(10px);
      border:1px solid rgba(255,255,255,0.12);border-radius:16px;
      padding:28px 36px;min-width:500px;
      box-shadow:0 8px 40px rgba(0,0,0,0.6);
      display:none;
    `;
    document.body.appendChild(this.container);
  }

  setEnemyCastle(castle: Castle): void {
    this.enemyCastle = castle;
  }

  toggle(): void {
    this._isVisible = !this._isVisible;
    this.container.style.display = this._isVisible ? 'block' : 'none';
    if (this._isVisible) this.render();
  }

  show(): void { this._isVisible = true; this.container.style.display = 'block'; this.render(); }
  hide(): void { this._isVisible = false; this.container.style.display = 'none'; }

  update(): void {
    if (this._isVisible) this.render();
  }

  private render(): void {
    const warriors = this.ecsWorld.queryByTag('warrior');
    const playerWarriors = warriors.filter(w => w.getComponent<TeamComponent>('team')?.team === 'player').length;
    const enemyWarriors = warriors.filter(w => w.getComponent<TeamComponent>('team')?.team === 'enemy').length;

    const pCastle = this.playerCastle;
    const eCastle = this.enemyCastle;

    const pHp = pCastle.totalHp;
    const pMaxHp = pCastle.maxHp;
    const pBuildings = pCastle.buildings.filter(b => b.hp > 0).length;

    const eHp = eCastle?.totalHp ?? 0;
    const eMaxHp = eCastle?.maxHp ?? 1;
    const eBuildings = eCastle?.buildings.filter(b => b.hp > 0).length ?? 0;

    const totalItems = this.inventory.getHotbar().reduce((sum, s) => sum + (s?.count ?? 0), 0);

    const bar = (current: number, max: number, color: string): string => {
      const pct = max > 0 ? Math.round((current / max) * 100) : 0;
      return `<div style="background:rgba(255,255,255,0.08);border-radius:6px;height:18px;overflow:hidden;margin:4px 0;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:6px;transition:width .3s;"></div>
      </div>
      <span style="font-size:12px;color:#999;">${current}/${max} (${pct}%)</span>`;
    };

    const pScore = Math.round(pHp * 0.5 + playerWarriors * 10 + pBuildings * 20 + totalItems * 0.5);
    const eScore = Math.round(eHp * 0.5 + enemyWarriors * 10 + eBuildings * 20);

    this.container.innerHTML = `
      <h2 style="text-align:center;margin:0 0 16px 0;font-size:24px;
        background:linear-gradient(135deg,#3498db,#e74c3c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        ⚔️ War Dashboard
      </h2>

      <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:8px;text-align:center;">

        <div style="font-size:18px;font-weight:bold;color:#3498db;">🛡️ Player</div>
        <div></div>
        <div style="font-size:18px;font-weight:bold;color:#e74c3c;">💀 Enemy</div>

        <div style="font-size:28px;font-weight:bold;color:#f1c40f;">${pScore}</div>
        <div style="font-size:14px;color:#666;align-self:center;">SCORE</div>
        <div style="font-size:28px;font-weight:bold;color:#f1c40f;">${eScore}</div>

        <div>
          <div style="font-size:12px;color:#aaa;margin-bottom:2px;">🏰 Castle HP</div>
          ${bar(pHp, pMaxHp, '#3498db')}
        </div>
        <div></div>
        <div>
          <div style="font-size:12px;color:#aaa;margin-bottom:2px;">🏰 Castle HP</div>
          ${bar(eHp, eMaxHp, '#e74c3c')}
        </div>

        <div style="font-size:22px;margin:8px 0;">${playerWarriors}</div>
        <div style="font-size:12px;color:#666;align-self:center;">⚔️ Army</div>
        <div style="font-size:22px;margin:8px 0;">${enemyWarriors}</div>

        <div style="font-size:22px;margin:4px 0;">${pBuildings}</div>
        <div style="font-size:12px;color:#666;align-self:center;">🏗️ Bldg</div>
        <div style="font-size:22px;margin:4px 0;">${eBuildings}</div>

        <div style="font-size:22px;margin:4px 0;">${totalItems}</div>
        <div style="font-size:12px;color:#666;align-self:center;">📦 Items</div>
        <div style="font-size:14px;color:#555;margin:4px 0;">—</div>
      </div>

      <p style="text-align:center;font-size:12px;color:#555;margin:16px 0 0 0;">Press Tab to close</p>
    `;
  }
}
