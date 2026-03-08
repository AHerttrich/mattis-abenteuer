/**
 * InventoryUI — Full-screen inventory grid with item icons.
 * Toggle with I key. Shows all 36 slots in a 4×9 grid (top row = hotbar).
 * Click to select, click again to swap slots.
 */

import type { Inventory } from '../crafting/Inventory';
import { getItemDef, type ItemStack } from '../crafting/Item';
import { getItemIcon, getItemTierColor } from './ItemIcons';

export class InventoryUI {
  private overlay: HTMLDivElement;
  private inventory: Inventory;
  private _isVisible = false;
  private selectedSlot: number | null = null;

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
    document.body.appendChild(this.overlay);
  }

  toggle(): void {
    if (this._isVisible) this.hide();
    else this.show();
  }

  show(): void {
    this._isVisible = true;
    this.selectedSlot = null;
    this.overlay.style.display = 'flex';
    this.render();
    document.exitPointerLock();
  }

  hide(): void {
    this._isVisible = false;
    this.overlay.style.display = 'none';
    this.selectedSlot = null;
  }

  private render(): void {
    const slots = this.inventory.slots;
    const hotbarSize = 9;

    let html = `
      <div style="background:rgba(20,20,40,0.92);border:1px solid rgba(255,255,255,0.12);
        border-radius:16px;padding:24px 28px;box-shadow:0 8px 48px rgba(0,0,0,0.7);">
        <h2 style="color:#fff;margin:0 0 16px 0;text-align:center;font-size:22px;
          background:linear-gradient(135deg,#f1c40f,#e67e22);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
          🎒 Inventory
        </h2>

        <!-- Backpack: rows 2-4 (slots 9..35) -->
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Backpack</div>
          <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:4px;">
    `;

    for (let i = hotbarSize; i < slots.length; i++) {
      html += this.renderSlot(i, slots[i]);
    }

    html += `
          </div>
        </div>

        <!-- Hotbar: row 1 (slots 0..8) -->
        <div>
          <div style="font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Hotbar</div>
          <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:4px;">
    `;

    for (let i = 0; i < hotbarSize; i++) {
      html += this.renderSlot(i, slots[i]);
    }

    html += `
          </div>
        </div>

        <p style="text-align:center;color:#555;font-size:12px;margin:14px 0 0 0;">
          Click to select, click another slot to swap · Press I to close
        </p>
      </div>
    `;

    this.overlay.innerHTML = html;

    // Attach click handlers
    this.overlay.querySelectorAll('[data-slot]').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.slot!, 10);
        this.onSlotClick(idx);
      });
    });
  }

  private renderSlot(index: number, stack: ItemStack | null): string {
    const isSelected = this.selectedSlot === index;
    const isHotbarActive = index === this.inventory.selectedHotbarSlot && index < 9;
    const borderColor = isSelected ? '#f1c40f' : isHotbarActive ? '#3498db' : (stack ? getItemTierColor(stack.itemId) : 'rgba(255,255,255,0.06)');
    const bgColor = isSelected ? 'rgba(241,196,15,0.15)' : 'rgba(255,255,255,0.03)';

    if (!stack) {
      return `<div data-slot="${index}" style="width:52px;height:52px;border:2px solid ${borderColor};
        border-radius:8px;background:${bgColor};cursor:pointer;transition:all .1s;
        display:flex;align-items:center;justify-content:center;
        " title="Empty"></div>`;
    }

    const def = getItemDef(stack.itemId);
    const icon = getItemIcon(stack.itemId);
    const name = def?.name ?? stack.itemId;
    const durPct = (stack.durability !== undefined && def?.durability)
      ? Math.round((stack.durability / def.durability) * 100)
      : null;

    let durBar = '';
    if (durPct !== null) {
      const barColor = durPct > 50 ? '#2ecc71' : durPct > 20 ? '#f1c40f' : '#e74c3c';
      durBar = `<div style="position:absolute;bottom:2px;left:4px;right:4px;height:3px;
        background:rgba(0,0,0,0.4);border-radius:2px;">
        <div style="width:${durPct}%;height:100%;background:${barColor};border-radius:2px;"></div>
      </div>`;
    }

    return `<div data-slot="${index}" style="width:52px;height:52px;border:2px solid ${borderColor};
      border-radius:8px;background:${bgColor};cursor:pointer;transition:all .1s;
      position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;
      " title="${name}${durPct !== null ? ` (${durPct}%)` : ''}">
      <span style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">${icon}</span>
      ${stack.count > 1 ? `<span style="position:absolute;bottom:1px;right:3px;font-size:10px;font-weight:bold;
        color:#fff;text-shadow:1px 1px 2px #000;">${stack.count}</span>` : ''}
      ${durBar}
    </div>`;
  }

  private onSlotClick(index: number): void {
    if (this.selectedSlot === null) {
      // Select this slot
      if (this.inventory.slots[index]) {
        this.selectedSlot = index;
        this.render();
      }
    } else if (this.selectedSlot === index) {
      // Deselect
      this.selectedSlot = null;
      this.render();
    } else {
      // Swap the two slots
      this.inventory.swapSlots(this.selectedSlot, index);
      this.selectedSlot = null;
      this.render();
    }
  }
}
