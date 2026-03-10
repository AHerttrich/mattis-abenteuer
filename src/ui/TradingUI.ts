/**
 * TradingUI — Full-screen overlay for villager trading.
 *
 * Shows the villager's name, profession icon, and available trades.
 * Each trade card shows what you give and what you receive, with
 * current stock and whether you can afford it.
 */

import type { Inventory } from '../crafting/Inventory';
import type { Villager, TradeOffer } from '../entities/VillagerSystem';
import { getItemDef } from '../crafting/Item';
import { getItemIcon } from './ItemIcons';

export class TradingUI {
  private overlay: HTMLDivElement;
  private inventory: Inventory;
  private _isVisible = false;
  private currentVillager: Villager | null = null;

  // Callback for recruitment trades
  private recruitCallback: ((type: string) => void) | null = null;

  get isVisible(): boolean {
    return this._isVisible;
  }

  constructor(inventory: Inventory) {
    this.inventory = inventory;

    this.overlay = document.createElement('div');
    this.overlay.id = 'trading-ui';
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);
      z-index:400;display:none;
      justify-content:center;align-items:center;
      font-family:'Segoe UI',sans-serif;
    `;
    document.body.appendChild(this.overlay);
  }

  /** Set callback for recruitment trades (items starting with _recruit_). */
  onRecruit(cb: (type: string) => void): void {
    this.recruitCallback = cb;
  }

  /** Open trading with a villager. */
  open(villager: Villager): void {
    this.currentVillager = villager;
    this._isVisible = true;
    this.overlay.style.display = 'flex';
    this.render();
    document.exitPointerLock();
  }

  hide(): void {
    this._isVisible = false;
    this.overlay.style.display = 'none';
    this.currentVillager = null;
  }

  private render(): void {
    if (!this.currentVillager) return;
    const v = this.currentVillager;

    this.overlay.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `background:rgba(20,20,40,0.94);border:1px solid rgba(255,255,255,0.15);
      border-radius:16px;padding:28px 32px;box-shadow:0 8px 48px rgba(0,0,0,0.7);
      min-width:400px;max-width:520px;max-height:80vh;overflow-y:auto;`;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;margin-bottom:20px;';
    const profIcons: Record<string, string> = {
      blacksmith: '⚒️',
      farmer: '🌾',
      merchant: '💰',
      recruiter: '⚔️',
    };
    header.innerHTML = `
      <div style="font-size:28px;margin-bottom:4px;">${profIcons[v.profession] || '👤'}</div>
      <div style="font-size:20px;font-weight:bold;color:#f1c40f;">${v.name}</div>
      <div style="font-size:13px;color:#888;text-transform:capitalize;">${v.profession}</div>
    `;
    panel.appendChild(header);

    // Trades
    for (let i = 0; i < v.trades.length; i++) {
      const trade = v.trades[i];
      const card = this.createTradeCard(trade, i);
      panel.appendChild(card);
    }

    // Close button
    const closeHint = document.createElement('div');
    closeHint.style.cssText = 'text-align:center;color:#555;font-size:12px;margin-top:16px;';
    closeHint.textContent = 'Press E or ESC to close';
    panel.appendChild(closeHint);

    this.overlay.appendChild(panel);
  }

  private createTradeCard(trade: TradeOffer, _index: number): HTMLDivElement {
    const canAfford = this.canAffordTrade(trade);
    const inStock = trade.used < trade.stock;
    const available = canAfford && inStock;

    const card = document.createElement('div');
    card.style.cssText = `
      background:rgba(255,255,255,${available ? '0.08' : '0.02'});
      border:1px solid ${available ? '#2ecc71' : 'rgba(255,255,255,0.08)'};
      border-radius:10px;padding:14px 16px;margin-bottom:10px;
      cursor:${available ? 'pointer' : 'default'};
      opacity:${available ? '1' : '0.45'};
      transition:all 0.15s;
      pointer-events:auto;
    `;

    // Cost row
    const costRow = document.createElement('div');
    costRow.style.cssText =
      'display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;';

    for (let i = 0; i < trade.give.length; i++) {
      if (i > 0) {
        const plus = document.createElement('span');
        plus.style.cssText = 'color:#666;font-size:13px;';
        plus.textContent = '+';
        costRow.appendChild(plus);
      }
      const item = trade.give[i];
      const def = getItemDef(item.itemId);
      const icon = getItemIcon(item.itemId);
      const have = this.inventory.countItem(item.itemId);
      const enough = have >= item.count;
      const span = document.createElement('span');
      span.style.cssText = `color:${enough ? '#2ecc71' : '#e74c3c'};font-size:13px;`;
      span.textContent = `${icon} ${def?.name ?? item.itemId} ×${item.count} (${have})`;
      costRow.appendChild(span);
    }
    card.appendChild(costRow);

    // Arrow + result
    const resultRow = document.createElement('div');
    resultRow.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const arrow = document.createElement('span');
    arrow.style.cssText = 'color:#f1c40f;font-size:16px;';
    arrow.textContent = '→';
    resultRow.appendChild(arrow);

    const isRecruit = trade.receive.itemId.startsWith('_recruit_');
    const resultIcon = isRecruit ? '⚔️' : getItemIcon(trade.receive.itemId);
    const resultName = isRecruit
      ? trade.receive.itemId.replace('_recruit_', '').replace('_', ' ') + ' warrior'
      : (getItemDef(trade.receive.itemId)?.name ?? trade.receive.itemId);

    const resultSpan = document.createElement('span');
    resultSpan.style.cssText = 'color:#3498db;font-size:15px;font-weight:bold;';
    resultSpan.textContent = `${resultIcon} ${resultName} ×${trade.receive.count}`;
    resultRow.appendChild(resultSpan);

    // Stock indicator
    const stock = document.createElement('span');
    stock.style.cssText = `margin-left:auto;font-size:11px;color:${inStock ? '#888' : '#e74c3c'};`;
    stock.textContent = inStock ? `${trade.stock - trade.used}/${trade.stock} left` : 'Sold out';
    resultRow.appendChild(stock);

    card.appendChild(resultRow);

    // Click handler
    if (available) {
      card.addEventListener('click', () => {
        this.executeTrade(trade);
        this.render();
      });
      card.addEventListener('mouseenter', () => {
        card.style.background = 'rgba(46,204,113,0.15)';
        card.style.borderColor = '#27ae60';
      });
      card.addEventListener('mouseleave', () => {
        card.style.background = 'rgba(255,255,255,0.08)';
        card.style.borderColor = '#2ecc71';
      });
    }

    return card;
  }

  private canAffordTrade(trade: TradeOffer): boolean {
    return trade.give.every((g) => this.inventory.countItem(g.itemId) >= g.count);
  }

  private executeTrade(trade: TradeOffer): void {
    if (!this.canAffordTrade(trade) || trade.used >= trade.stock) return;

    // Remove cost items
    for (const g of trade.give) {
      this.inventory.removeItem(g.itemId, g.count);
    }

    // Check if it's a recruitment trade
    if (trade.receive.itemId.startsWith('_recruit_') && this.recruitCallback) {
      const recruitType = trade.receive.itemId.replace('_recruit_', '');
      this.recruitCallback(recruitType);
    } else {
      // Add result item
      this.inventory.addItem(trade.receive.itemId, trade.receive.count);
    }

    trade.used++;
  }

  destroy(): void {
    this.overlay.remove();
  }
}
