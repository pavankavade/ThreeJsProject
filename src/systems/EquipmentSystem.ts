import { EventBus } from '../core/EventBus';
import type { LootItem } from '../entities/Chest';

export type ActiveSlotType = 1 | 2 | 3 | 4;
export type ArmorSlotType = 'head' | 'chest' | 'legs' | 'boots' | 'gloves';

export interface ArmorItem extends LootItem {
  armorRating?: number;
  slotType?: ArmorSlotType;
  vigorBonus?: number;
  agilityBonus?: number;
  dexBonus?: number;
}

export class EquipmentSystem {
  // Primary Weapon & Offhand Shield
  public weapon1: LootItem | null = {
    name: "Iron Falchion",
    type: 'WEAPON',
    description: "Standard Steel Curved Blade (+25 ATK)",
    value: 25
  };

  public weapon2: LootItem | null = {
    name: "Wooden Heater Shield",
    type: 'BUFF',
    description: "Blocks 85% Damage (+10 DEF)",
    value: 10
  };

  // Starter Adventurer Cloth Armor Set
  public headSlot: ArmorItem | null = {
    name: "Padded Cloth Hood",
    type: 'BUFF',
    slotType: 'head',
    description: "Coarse Linen Hood (+5 Armor)",
    value: 5,
    armorRating: 5,
    vigorBonus: 1
  };

  public chestSlot: ArmorItem | null = {
    name: "Adventurer Cloth Tunic",
    type: 'BUFF',
    slotType: 'chest',
    description: "Layered Linen Tunic (+12 Armor)",
    value: 12,
    armorRating: 12,
    vigorBonus: 2
  };

  public legsSlot: ArmorItem | null = {
    name: "Linen Trousers",
    type: 'BUFF',
    slotType: 'legs',
    description: "Flexible Cloth Trousers (+8 Armor)",
    value: 8,
    armorRating: 8,
    agilityBonus: 1
  };

  public bootsSlot: ArmorItem | null = {
    name: "Traveler Boots",
    type: 'BUFF',
    slotType: 'boots',
    description: "Soft Leather Boots (+5 Armor)",
    value: 5,
    armorRating: 5,
    agilityBonus: 2
  };

  public glovesSlot: ArmorItem | null = {
    name: "Leather Bracers",
    type: 'BUFF',
    slotType: 'gloves',
    description: "Simple Leather Wraps (+4 Armor)",
    value: 4,
    armorRating: 4,
    dexBonus: 1
  };

  // Belt 1 (Potions) - Stores up to 3 potions
  public belt1: (LootItem | null)[] = [
    { name: "Health Elixir", type: 'HEALTH', description: "Restores 50 HP", value: 50 },
    { name: "Greater Healing Potion", type: 'HEALTH', description: "Restores 100 HP", value: 100 },
    null
  ];
  public belt1Index: number = 0;

  // Belt 2 (Bandages) - Stores up to 3 bandages / pouches
  public belt2: (LootItem | null)[] = [
    { name: "Linen Bandage", type: 'HEALTH', description: "Restores 35 HP", value: 35 },
    { name: "Heavy Bandage", type: 'HEALTH', description: "Restores 60 HP", value: 60 },
    null
  ];
  public belt2Index: number = 0;

  // Storage Stash (16 slots) - Pre-filled with loot to test equip/unequip/drop
  public stash: (ArmorItem | null)[] = [
    { name: "Iron Kettle Helm", type: 'BUFF', slotType: 'head', description: "Heavy Iron Helm (+18 Armor)", value: 18, armorRating: 18, vigorBonus: 3 },
    { name: "Leather Doublet", type: 'BUFF', slotType: 'chest', description: "Hardened Leather Chest (+20 Armor)", value: 20, armorRating: 20, vigorBonus: 4 },
    { name: "Steel Plate Boots", type: 'BUFF', slotType: 'boots', description: "Reinforced Steel Boots (+15 Armor)", value: 15, armorRating: 15, agilityBonus: -1 },
    { name: "Heavy Gauntlets", type: 'BUFF', slotType: 'gloves', description: "Iron Riveted Gauntlets (+12 Armor)", value: 12, armorRating: 12, dexBonus: 2 },
    null, null, null, null,
    null, null, null, null,
    null, null, null, null
  ];

  // Active Selected Belt Slot (1, 2, 3, 4)
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

  public getArmorSlot(slotKey: ArmorSlotType): ArmorItem | null {
    if (slotKey === 'head') return this.headSlot;
    if (slotKey === 'chest') return this.chestSlot;
    if (slotKey === 'legs') return this.legsSlot;
    if (slotKey === 'boots') return this.bootsSlot;
    if (slotKey === 'gloves') return this.glovesSlot;
    return null;
  }

  public setArmorSlot(slotKey: ArmorSlotType, item: ArmorItem | null): void {
    if (slotKey === 'head') this.headSlot = item;
    else if (slotKey === 'chest') this.chestSlot = item;
    else if (slotKey === 'legs') this.legsSlot = item;
    else if (slotKey === 'boots') this.bootsSlot = item;
    else if (slotKey === 'gloves') this.glovesSlot = item;
  }

  /** Equip an item from Stash into its matching armor/weapon slot */
  public equipItemFromStash(stashIdx: number): void {
    const item = this.stash[stashIdx];
    if (!item) return;

    // 1. Armor Slots
    if (item.slotType) {
      const currentEquipped = this.getArmorSlot(item.slotType);
      this.setArmorSlot(item.slotType, item);
      this.stash[stashIdx] = currentEquipped; // Swap with currently equipped item or null
      EventBus.emit('EQUIPMENT_CHANGED');
      return;
    }

    // 2. Weapon Slot
    if (item.type === 'WEAPON') {
      const current = this.weapon1;
      this.weapon1 = item;
      this.stash[stashIdx] = current;
      EventBus.emit('EQUIPMENT_CHANGED');
      return;
    }
  }

  /** Unequip an armor slot back into Stash */
  public unequipArmorSlot(slotKey: ArmorSlotType): void {
    const item = this.getArmorSlot(slotKey);
    if (!item) return;

    // Find free stash slot
    const freeIdx = this.stash.findIndex(s => s === null);
    if (freeIdx !== -1) {
      this.stash[freeIdx] = item;
      this.setArmorSlot(slotKey, null);
      EventBus.emit('EQUIPMENT_CHANGED');
    }
  }

  /** Drop item from Stash (removes from inventory) */
  public dropItemFromStash(stashIdx: number): void {
    if (this.stash[stashIdx]) {
      this.stash[stashIdx] = null;
      EventBus.emit('EQUIPMENT_CHANGED');
    }
  }

  /** Drop equipped armor item */
  public dropEquippedArmor(slotKey: ArmorSlotType): void {
    if (this.getArmorSlot(slotKey)) {
      this.setArmorSlot(slotKey, null);
      EventBus.emit('EQUIPMENT_CHANGED');
    }
  }

  public getTotalArmorRating(): number {
    let total = 0;
    if (this.headSlot) total += this.headSlot.armorRating || 5;
    if (this.chestSlot) total += this.chestSlot.armorRating || 12;
    if (this.legsSlot) total += this.legsSlot.armorRating || 8;
    if (this.bootsSlot) total += this.bootsSlot.armorRating || 5;
    if (this.glovesSlot) total += this.glovesSlot.armorRating || 4;
    return total;
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
