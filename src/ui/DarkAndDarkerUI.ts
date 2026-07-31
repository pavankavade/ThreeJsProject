import { DarkAndDarkerEquipment } from '../systems/DarkAndDarkerEquipment';
import { EventBus } from '../core/EventBus';

export class DarkAndDarkerUI {
  private parent: HTMLElement;
  private equipment: DarkAndDarkerEquipment;
  private beltBarContainer!: HTMLElement;
  private modalOverlay!: HTMLElement;
  private gridContainer!: HTMLElement;
  private tooltipEl!: HTMLElement;
  private actionProgressBar!: HTMLElement;
  private actionProgressFill!: HTMLElement;

  constructor(parent: HTMLElement, equipment: DarkAndDarkerEquipment) {
    this.parent = parent;
    this.equipment = equipment;

    this.buildUI();
    this.registerEvents();
    this.render();
  }

  private buildUI(): void {
    // 1. Dark and Darker Hotbar (Bottom Center)
    this.beltBarContainer = document.createElement('div');
    this.beltBarContainer.className = 'hud-dad-hotbar';
    this.parent.appendChild(this.beltBarContainer);

    // 2. Action Progress Bar (Consumable drinking/bandaging)
    this.actionProgressBar = document.createElement('div');
    this.actionProgressBar.className = 'hud-action-progressbar hidden';

    const label = document.createElement('div');
    label.className = 'hud-action-label';
    label.textContent = 'USING ITEM...';
    this.actionProgressBar.appendChild(label);

    const track = document.createElement('div');
    track.className = 'hud-action-track';
    this.actionProgressFill = document.createElement('div');
    this.actionProgressFill.className = 'hud-action-fill';
    track.appendChild(this.actionProgressFill);
    this.actionProgressBar.appendChild(track);

    this.parent.appendChild(this.actionProgressBar);

    // 3. Full Character Equipment & Stash Modal (Tab Key)
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'hud-dad-modal hidden';

    const card = document.createElement('div');
    card.className = 'hud-dad-card';

    const header = document.createElement('div');
    header.className = 'hud-dad-header';
    header.textContent = 'EQUIPMENT & INVENTORY STASH';
    card.appendChild(header);

    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'hud-dad-grid';
    card.appendChild(this.gridContainer);

    const hint = document.createElement('div');
    hint.className = 'hud-dad-hint';
    hint.textContent = 'Press 1: Weapon | 2: Shield | 3: Cycle Potions | 4: Cycle Bandages | TAB: Close';
    card.appendChild(hint);

    this.modalOverlay.appendChild(card);
    this.parent.appendChild(this.modalOverlay);

    // Tooltip
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'hud-item-tooltip hidden';
    this.parent.appendChild(this.tooltipEl);
  }

  public toggle(): void {
    this.equipment.stash; // Read stash
    const isCurrentlyOpen = !this.modalOverlay.classList.contains('hidden');
    if (isCurrentlyOpen) {
      this.modalOverlay.classList.add('hidden');
      this.tooltipEl.classList.add('hidden');
    } else {
      this.modalOverlay.classList.remove('hidden');
    }
    this.render();
  }

  public showProgress(pct: number): void {
    if (pct > 0) {
      this.actionProgressBar.classList.remove('hidden');
      this.actionProgressFill.style.width = `${Math.min(100, pct * 100)}%`;
    } else {
      this.actionProgressBar.classList.add('hidden');
    }
  }

  public render(): void {
    // Render 4-slot Dark and Darker Belt (1, 2, 3, 4)
    this.beltBarContainer.replaceChildren();

    // Slot 1: Primary Weapon
    const slot1 = this.createBeltSlotElement('1', 'WEAPON 1', this.equipment.weapon1, this.equipment.activeSlot === 1, null);
    
    // Slot 2: Secondary Weapon / Shield
    const slot2 = this.createBeltSlotElement('2', 'OFFHAND', this.equipment.weapon2, this.equipment.activeSlot === 2, null);

    // Slot 3: Potions (Shows current active potion out of 3)
    const activePotion = this.equipment.belt1[this.equipment.belt1Index];
    const potionCountText = `(3x: #${this.equipment.belt1Index + 1})`;
    const slot3 = this.createBeltSlotElement('3', 'POTIONS', activePotion, this.equipment.activeSlot === 3, potionCountText);

    // Slot 4: Bandages (Shows current active bandage out of 3)
    const activeBandage = this.equipment.belt2[this.equipment.belt2Index];
    const bandageCountText = `(3x: #${this.equipment.belt2Index + 1})`;
    const slot4 = this.createBeltSlotElement('4', 'BANDAGES', activeBandage, this.equipment.activeSlot === 4, bandageCountText);

    this.beltBarContainer.appendChild(slot1);
    this.beltBarContainer.appendChild(slot2);
    this.beltBarContainer.appendChild(slot3);
    this.beltBarContainer.appendChild(slot4);

    // Render Full Equipment Sheet Modal if open
    if (!this.modalOverlay.classList.contains('hidden')) {
      this.gridContainer.replaceChildren();

      // Paperdoll Equipment slots
      const equipSection = document.createElement('div');
      equipSection.className = 'hud-dad-section';

      const title = document.createElement('div');
      title.className = 'hud-dad-section-title';
      title.textContent = 'Character Equipment';
      equipSection.appendChild(title);

      const slotsRow = document.createElement('div');
      slotsRow.className = 'hud-dad-equip-row';
      slotsRow.appendChild(this.createEquipSlotCard('Primary Weapon [1]', this.equipment.weapon1));
      slotsRow.appendChild(this.createEquipSlotCard('Offhand / Shield [2]', this.equipment.weapon2));
      slotsRow.appendChild(this.createEquipSlotCard('Potions Belt [3]', activePotion));
      slotsRow.appendChild(this.createEquipSlotCard('Bandages Belt [4]', activeBandage));
      equipSection.appendChild(slotsRow);

      this.gridContainer.appendChild(equipSection);

      // Stash Section
      const stashSection = document.createElement('div');
      stashSection.className = 'hud-dad-section';

      const stashTitle = document.createElement('div');
      stashTitle.className = 'hud-dad-section-title';
      stashTitle.textContent = 'Loot Stash Storage (16 Slots)';
      stashSection.appendChild(stashTitle);

      const stashGrid = document.createElement('div');
      stashGrid.className = 'hud-dad-stash-grid';
      this.equipment.stash.forEach((item) => {
        const slotEl = this.createStashSlotElement(item);
        stashGrid.appendChild(slotEl);
      });
      stashSection.appendChild(stashGrid);

      this.gridContainer.appendChild(stashSection);
    }
  }

  private createBeltSlotElement(
    keyLabel: string,
    slotTitle: string,
    item: any,
    isActive: boolean,
    subtext: string | null
  ): HTMLElement {
    const slotEl = document.createElement('div');
    slotEl.className = `hud-dad-slot ${isActive ? 'active' : ''}`;

    const keyBadge = document.createElement('div');
    keyBadge.className = 'hud-dad-keybadge';
    keyBadge.textContent = keyLabel;
    slotEl.appendChild(keyBadge);

    const title = document.createElement('div');
    title.className = 'hud-dad-slottitle';
    title.textContent = slotTitle;
    slotEl.appendChild(title);

    if (item) {
      const icon = document.createElement('div');
      icon.className = 'hud-dad-icon';
      if (item.name.includes('Bandage')) icon.textContent = '🩹';
      else if (item.name.includes('Potion') || item.name.includes('Elixir')) icon.textContent = '🧪';
      else if (item.type === 'WEAPON') icon.textContent = '⚔️';
      else icon.textContent = '🛡️';

      const name = document.createElement('div');
      name.className = 'hud-dad-name';
      name.textContent = item.name;

      slotEl.appendChild(icon);
      slotEl.appendChild(name);

      slotEl.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
      slotEl.addEventListener('mouseleave', () => this.hideTooltip());
    } else {
      const empty = document.createElement('div');
      empty.className = 'hud-dad-empty';
      empty.textContent = '[ Empty ]';
      slotEl.appendChild(empty);
    }

    if (subtext) {
      const sub = document.createElement('div');
      sub.className = 'hud-dad-subtext';
      sub.textContent = subtext;
      slotEl.appendChild(sub);
    }

    return slotEl;
  }

  private createEquipSlotCard(label: string, item: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'hud-dad-card-slot';

    const lbl = document.createElement('div');
    lbl.className = 'hud-dad-card-label';
    lbl.textContent = label;
    card.appendChild(lbl);

    if (item) {
      const val = document.createElement('div');
      val.className = 'hud-dad-card-val';
      val.textContent = `${item.name} (${item.description})`;
      card.appendChild(val);
    } else {
      const val = document.createElement('div');
      val.className = 'hud-dad-card-empty';
      val.textContent = 'Empty Slot';
      card.appendChild(val);
    }

    return card;
  }

  private createStashSlotElement(item: any): HTMLElement {
    const slotEl = document.createElement('div');
    slotEl.className = 'hud-inventory-slot';

    if (item) {
      const icon = document.createElement('div');
      icon.className = 'hud-item-icon';
      if (item.name.includes('Bandage')) icon.textContent = '🩹';
      else if (item.name.includes('Potion') || item.name.includes('Elixir')) icon.textContent = '🧪';
      else if (item.type === 'WEAPON') icon.textContent = '⚔️';
      else icon.textContent = '🛡️';

      slotEl.appendChild(icon);
      slotEl.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
      slotEl.addEventListener('mouseleave', () => this.hideTooltip());
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
    EventBus.on('EQUIPMENT_CHANGED', () => {
      this.render();
    });
  }
}
