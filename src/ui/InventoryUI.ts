/**
 * InventoryUI — Full-screen inventory with drag-and-drop, tooltips, and split stack.
 *
 * Features:
 *  - Drag items between slots (mousedown → drag → mouseup to drop)
 *  - Rich hover tooltips showing name, damage, durability, description
 *  - Right-click to split a stack in half
 *  - Visual drag ghost that follows cursor
 */

import type { Inventory } from '../crafting/Inventory';
import { getItemDef, type ItemStack } from '../crafting/Item';
import { getItemIcon, getItemTierColor } from './ItemIcons';

export class InventoryUI {
  private overlay: HTMLDivElement;
  private inventory: Inventory;
  private _isVisible = false;

  // Drag state
  private dragSource: number | null = null;
  private dragGhost: HTMLDivElement | null = null;

  // Tooltip
  private tooltip: HTMLDivElement;

  get isVisible(): boolean { return this._isVisible; }

  constructor(inventory: Inventory) {
    this.inventory = inventory;

    this.overlay = document.createElement('div');
    this.overlay.id = 'inventory-ui';
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);
      z-index:380;display:none;
      justify-content:center;align-items:center;
      font-family:'Segoe UI',sans-serif;
    `;

    // Tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position:fixed;pointer-events:none;z-index:500;display:none;
      background:rgba(15,15,30,0.95);border:1px solid rgba(255,255,255,0.2);
      border-radius:8px;padding:10px 14px;font-size:12px;color:#ddd;
      box-shadow:0 4px 20px rgba(0,0,0,0.6);max-width:220px;
      font-family:'Segoe UI',sans-serif;
    `;
    document.body.appendChild(this.tooltip);

    // Global mouse events for drag
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    document.body.appendChild(this.overlay);
  }

  toggle(): void {
    if (this._isVisible) this.hide();
    else this.show();
  }

  show(): void {
    this._isVisible = true;
    this.dragSource = null;
    this.overlay.style.display = 'flex';
    this.render();
    document.exitPointerLock();
  }

  hide(): void {
    this._isVisible = false;
    this.overlay.style.display = 'none';
    this.dragSource = null;
    this.hideTooltip();
    this.removeDragGhost();
  }

  private render(): void {
    const slots = this.inventory.slots;
    const hotbarSize = 9;

    this.overlay.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `background:rgba(20,20,40,0.92);border:1px solid rgba(255,255,255,0.12);
      border-radius:16px;padding:24px 28px;box-shadow:0 8px 48px rgba(0,0,0,0.7);`;

    // Title
    const title = document.createElement('h2');
    title.style.cssText = `color:#fff;margin:0 0 16px 0;text-align:center;font-size:22px;
      background:linear-gradient(135deg,#f1c40f,#e67e22);-webkit-background-clip:text;-webkit-text-fill-color:transparent;`;
    title.textContent = '🎒 Inventory';
    panel.appendChild(title);

    // Backpack section
    const bpLabel = document.createElement('div');
    bpLabel.style.cssText = 'font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;';
    bpLabel.textContent = 'Backpack';
    panel.appendChild(bpLabel);

    const bpGrid = document.createElement('div');
    bpGrid.style.cssText = 'display:grid;grid-template-columns:repeat(9,1fr);gap:4px;margin-bottom:16px;';
    for (let i = hotbarSize; i < slots.length; i++) {
      bpGrid.appendChild(this.createSlotElement(i, slots[i]));
    }
    panel.appendChild(bpGrid);

    // Hotbar section
    const hbLabel = document.createElement('div');
    hbLabel.style.cssText = 'font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;';
    hbLabel.textContent = 'Hotbar';
    panel.appendChild(hbLabel);

    const hbGrid = document.createElement('div');
    hbGrid.style.cssText = 'display:grid;grid-template-columns:repeat(9,1fr);gap:4px;';
    for (let i = 0; i < hotbarSize; i++) {
      hbGrid.appendChild(this.createSlotElement(i, slots[i]));
    }
    panel.appendChild(hbGrid);

    // Hint
    const hint = document.createElement('p');
    hint.style.cssText = 'text-align:center;color:#555;font-size:12px;margin:14px 0 0 0;';
    hint.textContent = 'Drag to move · Right-click to split · Press I to close';
    panel.appendChild(hint);

    this.overlay.appendChild(panel);
  }

  private createSlotElement(index: number, stack: ItemStack | null): HTMLDivElement {
    const el = document.createElement('div');
    const isHotbarActive = index === this.inventory.selectedHotbarSlot && index < 9;
    const isDragSource = this.dragSource === index;
    const borderColor = isDragSource ? '#f1c40f' : isHotbarActive ? '#3498db' : (stack ? getItemTierColor(stack.itemId) : 'rgba(255,255,255,0.06)');
    const bgColor = isDragSource ? 'rgba(241,196,15,0.15)' : 'rgba(255,255,255,0.03)';

    el.style.cssText = `width:52px;height:52px;border:2px solid ${borderColor};
      border-radius:8px;background:${bgColor};cursor:grab;transition:border-color .15s, background .15s;
      position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;
      user-select:none;`;
    el.dataset.slot = String(index);

    if (stack) {
      const def = getItemDef(stack.itemId);
      const icon = getItemIcon(stack.itemId);

      // Icon
      const iconSpan = document.createElement('span');
      iconSpan.style.cssText = 'font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));pointer-events:none;';
      iconSpan.textContent = icon;
      el.appendChild(iconSpan);

      // Count badge
      if (stack.count > 1) {
        const badge = document.createElement('span');
        badge.style.cssText = 'position:absolute;bottom:1px;right:3px;font-size:10px;font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;pointer-events:none;';
        badge.textContent = String(stack.count);
        el.appendChild(badge);
      }

      // Durability bar
      if (stack.durability !== undefined && def?.durability) {
        const pct = Math.round((stack.durability / def.durability) * 100);
        const barColor = pct > 50 ? '#2ecc71' : pct > 20 ? '#f1c40f' : '#e74c3c';
        const barBg = document.createElement('div');
        barBg.style.cssText = `position:absolute;bottom:2px;left:4px;right:4px;height:3px;background:rgba(0,0,0,0.4);border-radius:2px;pointer-events:none;`;
        const barFill = document.createElement('div');
        barFill.style.cssText = `width:${pct}%;height:100%;background:${barColor};border-radius:2px;`;
        barBg.appendChild(barFill);
        el.appendChild(barBg);
      }
    }

    // ── Events ──────────────────────────────────────────
    // Drag start
    el.addEventListener('mousedown', (e) => {
      if (e.button === 0 && stack) {
        this.dragSource = index;
        this.createDragGhost(stack, e.clientX, e.clientY);
        el.style.opacity = '0.4';
      }
    });

    // Right-click split
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!stack || stack.count < 2) return;
      // Find first empty slot
      const emptyIdx = this.inventory.slots.findIndex((s, i) => s === null && i !== index);
      if (emptyIdx >= 0) {
        this.inventory.splitStack(index, emptyIdx);
        this.render();
      }
    });

    // Hover tooltip
    el.addEventListener('mouseenter', (e) => {
      if (stack && !this.dragSource) {
        this.showTooltip(stack, e.clientX, e.clientY);
      }
      if (!this.dragSource) {
        el.style.borderColor = '#f1c40f';
      }
    });
    el.addEventListener('mouseleave', () => {
      this.hideTooltip();
      if (!this.dragSource) {
        el.style.borderColor = borderColor;
      }
    });

    // Drop target highlight
    el.addEventListener('dragover', (e) => e.preventDefault());

    return el;
  }

  // ── Drag & Drop ─────────────────────────────────────
  private createDragGhost(stack: ItemStack, x: number, y: number): void {
    this.removeDragGhost();
    const icon = getItemIcon(stack.itemId);
    this.dragGhost = document.createElement('div');
    this.dragGhost.style.cssText = `position:fixed;pointer-events:none;z-index:600;
      font-size:28px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.8));
      transform:translate(-50%,-50%);transition:none;`;
    this.dragGhost.textContent = icon;
    if (stack.count > 1) {
      const badge = document.createElement('span');
      badge.style.cssText = 'position:absolute;bottom:-4px;right:-4px;font-size:11px;font-weight:bold;color:#fff;background:rgba(0,0,0,0.7);border-radius:4px;padding:0 3px;';
      badge.textContent = String(stack.count);
      this.dragGhost.appendChild(badge);
    }
    this.dragGhost.style.left = x + 'px';
    this.dragGhost.style.top = y + 'px';
    document.body.appendChild(this.dragGhost);
  }

  private removeDragGhost(): void {
    if (this.dragGhost) { this.dragGhost.remove(); this.dragGhost = null; }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.dragGhost) {
      this.dragGhost.style.left = e.clientX + 'px';
      this.dragGhost.style.top = e.clientY + 'px';
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this._isVisible || this.dragSource === null) return;
    this.removeDragGhost();

    // Find which slot we dropped on
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const slotEl = target?.closest('[data-slot]') as HTMLElement | null;

    if (slotEl) {
      const targetIdx = parseInt(slotEl.dataset.slot!, 10);
      if (targetIdx !== this.dragSource) {
        this.inventory.swapSlots(this.dragSource, targetIdx);
      }
    }

    this.dragSource = null;
    this.render();
  }

  // ── Tooltip ─────────────────────────────────────────
  private showTooltip(stack: ItemStack, x: number, y: number): void {
    const def = getItemDef(stack.itemId);
    const icon = getItemIcon(stack.itemId);
    const tierColor = getItemTierColor(stack.itemId);

    let html = `<div style="font-size:15px;font-weight:bold;color:${tierColor};margin-bottom:6px;">${icon} ${def?.name ?? stack.itemId}</div>`;

    // Stats
    const stats: string[] = [];
    if (def?.damage) stats.push(`⚔️ Damage: <span style="color:#e74c3c">${def.damage}</span>`);
    if (def?.armor) stats.push(`🛡️ Armor: <span style="color:#3498db">${def.armor}</span>`);
    if (def?.hungerRestore) stats.push(`🍖 Hunger: <span style="color:#2ecc71">+${def.hungerRestore}</span>`);

    if (stack.durability !== undefined && def?.durability) {
      const pct = Math.round((stack.durability / def.durability) * 100);
      const color = pct > 50 ? '#2ecc71' : pct > 20 ? '#f1c40f' : '#e74c3c';
      stats.push(`🔧 Durability: <span style="color:${color}">${stack.durability}/${def.durability} (${pct}%)</span>`);
    }

    if (stats.length) {
      html += `<div style="margin-bottom:6px;line-height:1.6;">${stats.join('<br>')}</div>`;
    }

    // Stack info
    if (stack.count > 1) {
      html += `<div style="color:#7f8c8d;font-size:11px;">Stack: ${stack.count}</div>`;
    }

    // Category
    if (def?.category) {
      const typeColors: Record<string, string> = { weapon: '#e74c3c', tool: '#3498db', armor: '#9b59b6', food: '#2ecc71', block: '#95a5a6', material: '#7f8c8d' };
      html += `<div style="color:${typeColors[def.category] ?? '#666'};font-size:10px;text-transform:uppercase;margin-top:4px;letter-spacing:1px;">${def.category}</div>`;
    }

    // Hint
    html += `<div style="color:#555;font-size:10px;margin-top:6px;border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;">Right-click to split</div>`;

    this.tooltip.innerHTML = html;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (x + 16) + 'px';
    this.tooltip.style.top = (y - 10) + 'px';
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }
}
