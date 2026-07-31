import { InventorySystem } from '../systems/Inventory';
import { EventBus } from '../core/EventBus';
import type { LootItem } from '../entities/Chest';

export class InventoryUI {
  private parent: HTMLElement;
  private inventory: InventorySystem;
  private hotbarContainer!: HTMLElement;
  private modalOverlay!: HTMLElement;
  private gridContainer!: HTMLElement;
  private tooltipEl!: HTMLElement;

  private onHealPlayer: (hp: number) => void;
  private onEquipWeapon: (item: LootItem | null) => void;

  constructor(
    parent: HTMLElement,
    inventory: InventorySystem,
    onHealPlayer: (hp: number) => void,
    onEquipWeapon: (item: LootItem | null) => void
  ) {
    this.parent = parent;
    this.inventory = inventory;
    this.onHealPlayer = onHealPlayer;
    this.onEquipWeapon = onEquipWeapon;

    this.buildUI();
    this.registerEvents();
    this.render();
  }

  private buildUI(): void {
    // --- Hotbar (Always visible at bottom center) ---
    this.hotbarContainer = document.createElement('div');
    this.hotbarContainer.className = 'hud-hotbar-container';
    this.parent.appendChild(this.hotbarContainer);

    // --- Full Minecraft-Style Inventory Modal ---
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'hud-inventory-modal hidden';

    const card = document.createElement('div');
    card.className = 'hud-inventory-card';

    const header = document.createElement('div');
    header.className = 'hud-inventory-header';
    header.textContent = 'INVENTORY';
    card.appendChild(header);

    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'hud-inventory-grid';
    card.appendChild(this.gridContainer);

    const hint = document.createElement('div');
    hint.className = 'hud-inventory-hint';
    hint.textContent = 'Click weapons/potions to equip/use | Press 1-9 to switch hotbar | Press TAB to close';
    card.appendChild(hint);

    this.modalOverlay.appendChild(card);
    this.parent.appendChild(this.modalOverlay);

    // Tooltip
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'hud-item-tooltip hidden';
    this.parent.appendChild(this.tooltipEl);
  }

  public toggle(): void {
    this.inventory.isOpen = !this.inventory.isOpen;
    if (this.inventory.isOpen) {
      this.modalOverlay.classList.remove('hidden');
    } else {
      this.modalOverlay.classList.add('hidden');
      this.tooltipEl.classList.add('hidden');
    }
    this.render();
  }

  public render(): void {
    // 1. Render Hotbar (Slots 27 to 35)
    this.hotbarContainer.replaceChildren();
    for (let i = 27; i < 36; i++) {
      const slotIndex = i - 27;
      const slot = this.inventory.slots[i];
      const slotEl = this.createSlotElement(slot, slotIndex === this.inventory.selectedHotbarIndex, slotIndex + 1);
      this.hotbarContainer.appendChild(slotEl);
    }

    // 2. Render Full Modal Inventory (Slots 0 to 35)
    if (this.inventory.isOpen) {
      this.gridContainer.replaceChildren();

      // Main Inventory Label
      const mainLabel = document.createElement('div');
      mainLabel.className = 'hud-inventory-section-title';
      mainLabel.textContent = 'Main Storage (3x9)';
      this.gridContainer.appendChild(mainLabel);

      const mainGrid = document.createElement('div');
      mainGrid.className = 'hud-slot-matrix';

      for (let i = 0; i < 27; i++) {
        const slot = this.inventory.slots[i];
        const slotEl = this.createSlotElement(slot, false, null);
        mainGrid.appendChild(slotEl);
      }
      this.gridContainer.appendChild(mainGrid);

      // Hotbar Label
      const hotbarLabel = document.createElement('div');
      hotbarLabel.className = 'hud-inventory-section-title';
      hotbarLabel.textContent = 'Hotbar (1-9)';
      this.gridContainer.appendChild(hotbarLabel);

      const hotbarGrid = document.createElement('div');
      hotbarGrid.className = 'hud-slot-matrix hotbar';

      for (let i = 27; i < 36; i++) {
        const slotIndex = i - 27;
        const slot = this.inventory.slots[i];
        const slotEl = this.createSlotElement(slot, slotIndex === this.inventory.selectedHotbarIndex, slotIndex + 1);
        hotbarGrid.appendChild(slotEl);
      }
      this.gridContainer.appendChild(hotbarGrid);
    }
  }

  private createSlotElement(slot: any, isActive: boolean, hotbarDigit: number | null): HTMLElement {
    const slotEl = document.createElement('div');
    slotEl.className = `hud-inventory-slot ${isActive ? 'active' : ''}`;

    if (hotbarDigit !== null) {
      const digitEl = document.createElement('div');
      digitEl.className = 'hud-slot-digit';
      digitEl.textContent = `${hotbarDigit}`;
      slotEl.appendChild(digitEl);
    }

    if (slot.item) {
      const icon = document.createElement('div');
      icon.className = `hud-item-icon type-${slot.item.type.toLowerCase()}`;
      
      // Symbol representation
      if (slot.item.type === 'WEAPON') icon.textContent = '⚔️';
      else if (slot.item.type === 'HEALTH') icon.textContent = '🧪';
      else if (slot.item.type === 'GOLD') icon.textContent = '🪙';
      else icon.textContent = '🛡️';

      slotEl.appendChild(icon);

      if (slot.count > 1) {
        const count = document.createElement('div');
        count.className = 'hud-item-count';
        count.textContent = `${slot.count}`;
        slotEl.appendChild(count);
      }

      // Interactivity
      slotEl.addEventListener('mouseenter', (e) => this.showTooltip(e, slot.item));
      slotEl.addEventListener('mouseleave', () => this.hideTooltip());
      slotEl.addEventListener('click', () => {
        this.inventory.useItem(slot.id, this.onHealPlayer, this.onEquipWeapon);
        this.render();
      });
    }

    return slotEl;
  }

  private showTooltip(e: MouseEvent, item: any): void {
    this.tooltipEl.replaceChildren();

    const name = document.createElement('div');
    name.className = 'hud-tooltip-name';
    name.textContent = item.name;

    const desc = document.createElement('div');
    desc.className = 'hud-tooltip-desc';
    desc.textContent = item.description;

    this.tooltipEl.appendChild(name);
    this.tooltipEl.appendChild(desc);

    this.tooltipEl.style.left = `${e.clientX + 15}px`;
    this.tooltipEl.style.top = `${e.clientY + 15}px`;
    this.tooltipEl.classList.remove('hidden');
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.add('hidden');
  }

  private registerEvents(): void {
    EventBus.on('INVENTORY_UPDATED', () => {
      this.render();
    });

    EventBus.on('HOTBAR_SLOT_CHANGED', () => {
      this.render();
    });
  }
}
