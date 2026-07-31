import { EventBus } from '../core/EventBus';
import type { LootItem } from '../entities/Chest';

export type ActiveSlotType = 1 | 2 | 3 | 4;

export class EquipmentSystem {
  // Slot 1: Primary Weapon
  public weapon1: LootItem | null = {
    name: "Iron Falchion",
    type: 'WEAPON',
    description: "Standard Steel Curved Blade (+25 ATK)",
    value: 25
  };

  // Slot 2: Secondary / Shield
  public weapon2: LootItem | null = {
    name: "Wooden Heater Shield",
    type: 'BUFF',
    description: "Blocks 85% Damage",
    value: 10
  };

  // Slot 3: Belt 1 (Potions) - Stores up to 3 potions
  public belt1: (LootItem | null)[] = [
    { name: "Health Elixir", type: 'HEALTH', description: "Restores 50 HP", value: 50 },
    { name: "Greater Healing Potion", type: 'HEALTH', description: "Restores 100 HP", value: 100 },
    null
  ];
  public belt1Index: number = 0;

  // Slot 4: Belt 2 (Bandages) - Stores up to 3 bandages / pouches
  public belt2: (LootItem | null)[] = [
    { name: "Linen Bandage", type: 'HEALTH', description: "Restores 35 HP", value: 35 },
    { name: "Heavy Bandage", type: 'HEALTH', description: "Restores 60 HP", value: 60 },
    null
  ];
  public belt2Index: number = 0;

  // Storage Stash (16 slots)
  public stash: (LootItem | null)[] = Array(16).fill(null);

  // Active Selected Slot (1, 2, 3, 4)
  public activeSlot: ActiveSlotType = 1;

  constructor() {
    EventBus.on('LOOT_ACQUIRED', (item: LootItem) => {
      this.autoStoreLoot(item);
    });
  }

  public selectSlot(slotNum: ActiveSlotType): void {
    if (slotNum === 3) {
      if (this.activeSlot === 3) {
        this.cycleBelt1();
      }
      this.activeSlot = 3;
    } else if (slotNum === 4) {
      if (this.activeSlot === 4) {
        this.cycleBelt2();
      }
      this.activeSlot = 4;
    } else {
      this.activeSlot = slotNum;
    }

    EventBus.emit('EQUIPMENT_CHANGED');
  }

  public cycleBelt1(): void {
    this.belt1Index = (this.belt1Index + 1) % 3;
    EventBus.emit('EQUIPMENT_CHANGED');
  }

  public cycleBelt2(): void {
    this.belt2Index = (this.belt2Index + 1) % 3;
    EventBus.emit('EQUIPMENT_CHANGED');
  }

  public getActiveHandItem(): LootItem | null {
    if (this.activeSlot === 1) return this.weapon1;
    if (this.activeSlot === 2) return this.weapon2;
    if (this.activeSlot === 3) return this.belt1[this.belt1Index];
    if (this.activeSlot === 4) return this.belt2[this.belt2Index];
    return null;
  }

  public consumeActiveConsumable(): void {
    if (this.activeSlot === 3) {
      this.belt1[this.belt1Index] = null;
      for (let i = 0; i < 3; i++) {
        const nextIdx = (this.belt1Index + i) % 3;
        if (this.belt1[nextIdx] !== null) {
          this.belt1Index = nextIdx;
          break;
        }
      }
    } else if (this.activeSlot === 4) {
      this.belt2[this.belt2Index] = null;
      for (let i = 0; i < 3; i++) {
        const nextIdx = (this.belt2Index + i) % 3;
        if (this.belt2[nextIdx] !== null) {
          this.belt2Index = nextIdx;
          break;
        }
      }
    }
    EventBus.emit('EQUIPMENT_CHANGED');
  }

  public autoStoreLoot(item: LootItem): void {
    if (item.type === 'WEAPON' && !this.weapon1) {
      this.weapon1 = item;
      EventBus.emit('EQUIPMENT_CHANGED');
      return;
    }

    if (item.type === 'HEALTH' && (item.name.includes('Potion') || item.name.includes('Elixir'))) {
      for (let i = 0; i < 3; i++) {
        if (!this.belt1[i]) {
          this.belt1[i] = item;
          EventBus.emit('EQUIPMENT_CHANGED');
          return;
        }
      }
    }

    if (item.type === 'HEALTH' && item.name.includes('Bandage')) {
      for (let i = 0; i < 3; i++) {
        if (!this.belt2[i]) {
          this.belt2[i] = item;
          EventBus.emit('EQUIPMENT_CHANGED');
          return;
        }
      }
    }

    for (let i = 0; i < this.stash.length; i++) {
      if (!this.stash[i]) {
        this.stash[i] = item;
        EventBus.emit('EQUIPMENT_CHANGED');
        return;
      }
    }
  }
}
