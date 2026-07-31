import { EventBus } from '../core/EventBus';
import type { LootItem } from '../entities/Chest';

export interface InventorySlot {
  id: number;
  item: LootItem | null;
  count: number;
}

export class InventorySystem {
  public slots: InventorySlot[] = [];
  public selectedHotbarIndex: number = 0;
  public isOpen: boolean = false;

  constructor() {
    // 36 total slots: 27 main inventory (0-26) + 9 hotbar (27-35)
    for (let i = 0; i < 36; i++) {
      this.slots.push({ id: i, item: null, count: 0 });
    }

    // Default starter items in hotbar
    this.slots[27] = {
      id: 27,
      item: { name: "Iron Longsword", type: 'WEAPON', description: "Standard Steel Blade (+25 ATK)", value: 25 },
      count: 1
    };

    this.slots[28] = {
      id: 28,
      item: { name: "Wooden Heater Shield", type: 'BUFF', description: "Blocks 85% Damage", value: 10 },
      count: 1
    };

    this.slots[29] = {
      id: 29,
      item: { name: "Health Elixir", type: 'HEALTH', description: "Restores 50 HP", value: 50 },
      count: 2
    };

    EventBus.on('LOOT_ACQUIRED', (item: LootItem) => {
      this.addItem(item);
    });
  }

  public selectHotbarSlot(index: number, onEquipWeapon?: (item: LootItem | null) => void): void {
    if (index < 0 || index >= 9) return;
    this.selectedHotbarIndex = index;
    const activeSlot = this.slots[27 + index];

    if (onEquipWeapon) {
      onEquipWeapon(activeSlot ? activeSlot.item : null);
    }

    EventBus.emit('HOTBAR_SLOT_CHANGED', { index, item: activeSlot ? activeSlot.item : null });
    EventBus.emit('INVENTORY_UPDATED');
  }

  public addItem(item: LootItem): boolean {
    // 1. Try stacking if existing non-full slot
    for (const slot of this.slots) {
      if (slot.item && slot.item.name === item.name) {
        slot.count++;
        EventBus.emit('INVENTORY_UPDATED');
        return true;
      }
    }

    // 2. Find first empty slot (prefer hotbar first, then main)
    for (let i = 27; i < 36; i++) {
      if (!this.slots[i].item) {
        this.slots[i] = { id: i, item, count: 1 };
        EventBus.emit('INVENTORY_UPDATED');
        return true;
      }
    }

    for (let i = 0; i < 27; i++) {
      if (!this.slots[i].item) {
        this.slots[i] = { id: i, item, count: 1 };
        EventBus.emit('INVENTORY_UPDATED');
        return true;
      }
    }

    return false; // Inventory full
  }

  public useItem(
    slotId: number,
    playerHealCallback: (hp: number) => void,
    onEquipWeapon?: (item: LootItem | null) => void
  ): void {
    const slot = this.slots[slotId];
    if (!slot || !slot.item) return;

    if (slot.item.type === 'HEALTH') {
      playerHealCallback(slot.item.value);
      slot.count--;
      if (slot.count <= 0) {
        slot.item = null;
      }
      EventBus.emit('INVENTORY_UPDATED');
    } else if (slot.item.type === 'WEAPON') {
      if (onEquipWeapon) {
        onEquipWeapon(slot.item);
      }
      EventBus.emit('INVENTORY_UPDATED');
    }
  }
}
