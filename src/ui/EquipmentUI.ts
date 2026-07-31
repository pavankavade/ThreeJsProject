import * as THREE from 'three';
import { EquipmentSystem } from '../systems/EquipmentSystem';
import type { ArmorSlotType } from '../systems/EquipmentSystem';
import { CharacterPaperdoll } from '../entities/CharacterPaperdoll';
import { EventBus } from '../core/EventBus';

export interface PlayerStatsRef {
  vigor: number;
  agility: number;
  dexterity: number;
  health: { current: number; max: number };
  stamina: number;
  maxStamina: number;
  attackPower: number;
}

export class EquipmentUI {
  private parent: HTMLElement;
  private equipment: EquipmentSystem;
  private playerStats: PlayerStatsRef | null = null;
  
  private beltBarLeft!: HTMLElement;
  private beltBarRight!: HTMLElement;
  private modalOverlay!: HTMLElement;
  private gridContainer!: HTMLElement;
  private tooltipEl!: HTMLElement;
  private actionProgressBar!: HTMLElement;
  private actionProgressFill!: HTMLElement;

  // 3D Paperdoll Viewport
  private paperdollCanvas!: HTMLCanvasElement;
  private paperdollRenderer!: THREE.WebGLRenderer;
  private paperdollScene!: THREE.Scene;
  private paperdollCamera!: THREE.PerspectiveCamera;
  private paperdollModel!: CharacterPaperdoll;
  private animationFrameId: number | null = null;

  constructor(parent: HTMLElement, equipment: EquipmentSystem) {
    this.parent = parent;
    this.equipment = equipment;

    this.buildUI();
    this.initPaperdoll3D();
    this.registerEvents();
    this.render();
  }

  public setPlayerStats(stats: PlayerStatsRef): void {
    this.playerStats = stats;
  }

  private buildUI(): void {
    // 1. Tactical Equipment Hotbar - Left Corner (Weapon [1] & Offhand [2])
    this.beltBarLeft = document.createElement('div');
    this.beltBarLeft.className = 'hud-equip-hotbar hud-hotbar-left';
    this.parent.appendChild(this.beltBarLeft);

    // 2. Tactical Equipment Hotbar - Right Corner (Potions [3] & Bandages [4])
    this.beltBarRight = document.createElement('div');
    this.beltBarRight.className = 'hud-equip-hotbar hud-hotbar-right';
    this.parent.appendChild(this.beltBarRight);

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
    this.modalOverlay.className = 'hud-equip-modal hidden';

    const card = document.createElement('div');
    card.className = 'hud-equip-card dark-and-darker-card';

    const header = document.createElement('div');
    header.className = 'hud-equip-header';
    header.textContent = 'TACTICAL CHARACTER EQUIPMENT & STASH';
    card.appendChild(header);

    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'hud-equip-grid-layout';
    card.appendChild(this.gridContainer);

    const hint = document.createElement('div');
    hint.className = 'hud-equip-hint';
    hint.textContent = 'LEFT-CLICK: Equip / Unequip | RIGHT-CLICK: Drop Item | TAB: Exit';
    card.appendChild(hint);

    this.modalOverlay.appendChild(card);
    this.parent.appendChild(this.modalOverlay);

    // Tooltip
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'hud-item-tooltip hidden';
    this.parent.appendChild(this.tooltipEl);
  }

  private initPaperdoll3D(): void {
    this.paperdollCanvas = document.createElement('canvas');
    this.paperdollCanvas.className = 'hud-paperdoll-canvas';
    this.paperdollCanvas.width = 220;
    this.paperdollCanvas.height = 320;

    this.paperdollRenderer = new THREE.WebGLRenderer({
      canvas: this.paperdollCanvas,
      alpha: true,
      antialias: true
    });
    this.paperdollRenderer.setSize(220, 320);
    this.paperdollRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.paperdollScene = new THREE.Scene();
    this.paperdollCamera = new THREE.PerspectiveCamera(40, 220 / 320, 0.1, 10);
    this.paperdollCamera.position.set(0, 0.05, 2.6);

    // Warm medieval torchlight ambiance
    const ambientLight = new THREE.AmbientLight(0xffeedd, 1.2);
    const dirLight = new THREE.DirectionalLight(0xffc87a, 2.5);
    dirLight.position.set(2, 4, 3);
    const backLight = new THREE.DirectionalLight(0xcc8844, 1.0);
    backLight.position.set(-2, 2, -3);
    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.6);
    fillLight.position.set(0, 1, 4);

    this.paperdollScene.add(ambientLight, dirLight, backLight, fillLight);

    this.paperdollModel = new CharacterPaperdoll(this.equipment);
    this.paperdollScene.add(this.paperdollModel.group);

    // Interactive Drag-to-Rotate (Click and drag mouse to rotate character 360°)
    let isDragging = false;
    let previousMouseX = 0;

    this.paperdollCanvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMouseX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging && this.paperdollModel) {
        const deltaX = e.clientX - previousMouseX;
        previousMouseX = e.clientX;
        this.paperdollModel.group.rotation.y += deltaX * 0.015;
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  public isOpen: boolean = false;

  public toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.modalOverlay.classList.remove('hidden');
      this.start3DLoop();
    } else {
      this.modalOverlay.classList.add('hidden');
      this.tooltipEl.classList.add('hidden');
      this.stop3DLoop();
    }
    this.render();
  }

  private start3DLoop(): void {
    if (this.animationFrameId !== null) return;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      this.paperdollModel.update(delta);
      this.paperdollRenderer.render(this.paperdollScene, this.paperdollCamera);

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stop3DLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
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
    this.beltBarLeft.replaceChildren();
    this.beltBarRight.replaceChildren();

    // Hotbar slots 1-4
    const activePotion = this.equipment.belt1[this.equipment.belt1Index];
    const activeBandage = this.equipment.belt2[this.equipment.belt2Index];

    const slot1 = this.createBeltSlotElement('1', 'WEAPON', this.equipment.weapon1, this.equipment.activeSlot === 1, null);
    const slot2 = this.createBeltSlotElement('2', 'OFFHAND', this.equipment.weapon2, this.equipment.activeSlot === 2, null);
    const slot3 = this.createBeltSlotElement('3', 'POTIONS', activePotion, this.equipment.activeSlot === 3, `(#${this.equipment.belt1Index + 1})`);
    const slot4 = this.createBeltSlotElement('4', 'BANDAGES', activeBandage, this.equipment.activeSlot === 4, `(#${this.equipment.belt2Index + 1})`);

    this.beltBarLeft.appendChild(slot1);
    this.beltBarLeft.appendChild(slot2);
    this.beltBarRight.appendChild(slot3);
    this.beltBarRight.appendChild(slot4);

    // Update 3D Paperdoll visual model
    if (this.paperdollModel) {
      this.paperdollModel.updateArmorVisuals();
    }

    // Render Full Equipment Modal layout if open
    if (!this.modalOverlay.classList.contains('hidden')) {
      this.gridContainer.replaceChildren();

      // ── Left Column: Armor & Hand Equipment Slots ──
      const equipColumn = document.createElement('div');
      equipColumn.className = 'hud-equip-column';

      const equipTitle = document.createElement('div');
      equipTitle.className = 'hud-equip-section-title';
      equipTitle.textContent = 'EQUIPPED ARMOR';
      equipColumn.appendChild(equipTitle);

      const armorGrid = document.createElement('div');
      armorGrid.className = 'hud-armor-slots-grid';

      armorGrid.appendChild(this.createArmorSlotCard('HEAD', '🪖', 'head', this.equipment.headSlot));
      armorGrid.appendChild(this.createArmorSlotCard('CHEST', '🎽', 'chest', this.equipment.chestSlot));
      armorGrid.appendChild(this.createArmorSlotCard('LEGS', '👖', 'legs', this.equipment.legsSlot));
      armorGrid.appendChild(this.createArmorSlotCard('BOOTS', '👢', 'boots', this.equipment.bootsSlot));
      armorGrid.appendChild(this.createArmorSlotCard('GLOVES', '🧤', 'gloves', this.equipment.glovesSlot));

      equipColumn.appendChild(armorGrid);

      const weaponsTitle = document.createElement('div');
      weaponsTitle.className = 'hud-equip-section-title';
      weaponsTitle.style.marginTop = '14px';
      weaponsTitle.textContent = 'WEAPONS & BELT';
      equipColumn.appendChild(weaponsTitle);

      const weaponsGrid = document.createElement('div');
      weaponsGrid.className = 'hud-armor-slots-grid';
      weaponsGrid.appendChild(this.createWeaponSlotCard('WEAPON [1]', '⚔️', this.equipment.weapon1));
      weaponsGrid.appendChild(this.createWeaponSlotCard('OFFHAND [2]', '🛡️', this.equipment.weapon2));
      equipColumn.appendChild(weaponsGrid);

      this.gridContainer.appendChild(equipColumn);

      // ── Center Column: 3D Character Viewport Paperdoll ──
      const centerColumn = document.createElement('div');
      centerColumn.className = 'hud-paperdoll-column';

      const paperdollWrapper = document.createElement('div');
      paperdollWrapper.className = 'hud-paperdoll-viewport';
      paperdollWrapper.appendChild(this.paperdollCanvas);

      const totalArmorBanner = document.createElement('div');
      totalArmorBanner.className = 'hud-armor-rating-badge';
      totalArmorBanner.textContent = `TOTAL ARMOR: +${this.equipment.getTotalArmorRating()}`;
      paperdollWrapper.appendChild(totalArmorBanner);

      const rotateHint = document.createElement('div');
      rotateHint.className = 'hud-rotate-3d-hint';
      rotateHint.textContent = '↔️ Click & Drag to Rotate 360°';

      centerColumn.appendChild(paperdollWrapper);
      centerColumn.appendChild(rotateHint);
      this.gridContainer.appendChild(centerColumn);

      // ── Right Column: Attributes & Inventory Stash ──
      const rightColumn = document.createElement('div');
      rightColumn.className = 'hud-equip-column';

      if (this.playerStats) {
        const statsTitle = document.createElement('div');
        statsTitle.className = 'hud-equip-section-title';
        statsTitle.textContent = 'CHARACTER ATTRIBUTES';
        rightColumn.appendChild(statsTitle);

        const statsGrid = document.createElement('div');
        statsGrid.className = 'hud-stats-grid-compact';

        const statEntries = [
          { name: 'VIGOR', icon: '❤️', value: this.playerStats.vigor, color: '#e53e3e', desc: `HP: ${Math.ceil(this.playerStats.health.current)}/${this.playerStats.health.max}` },
          { name: 'AGILITY', icon: '⚡', value: this.playerStats.agility, color: '#3182ce', desc: `Move: ${(3.0 + this.playerStats.agility * 0.05).toFixed(1)}` },
          { name: 'DEX', icon: '🗡️', value: this.playerStats.dexterity, color: '#ecc94b', desc: `ATK: ${this.playerStats.attackPower}` }
        ];

        statEntries.forEach(s => {
          const card = document.createElement('div');
          card.className = 'hud-stat-card-compact';
          card.innerHTML = `<span class="icon">${s.icon}</span> <b>${s.name}:</b> <span style="color:${s.color}; font-weight:800">${s.value}</span> <small>(${s.desc})</small>`;
          statsGrid.appendChild(card);
        });

        rightColumn.appendChild(statsGrid);
      }

      // Inventory Stash (16 Slots)
      const stashTitle = document.createElement('div');
      stashTitle.className = 'hud-equip-section-title';
      stashTitle.style.marginTop = '14px';
      stashTitle.textContent = 'INVENTORY STASH (16 SLOTS)';
      rightColumn.appendChild(stashTitle);

      const stashGrid = document.createElement('div');
      stashGrid.className = 'hud-equip-stash-grid';

      this.equipment.stash.forEach((item, idx) => {
        const slotEl = this.createStashSlotElement(item, idx);
        stashGrid.appendChild(slotEl);
      });

      rightColumn.appendChild(stashGrid);
      this.gridContainer.appendChild(rightColumn);
    }
  }

  private createArmorSlotCard(slotLabel: string, iconStr: string, slotKey: ArmorSlotType, item: any): HTMLElement {
    const card = document.createElement('div');
    card.className = `hud-armor-slot-card ${item ? 'filled' : 'empty'}`;

    const label = document.createElement('div');
    label.className = 'hud-armor-slot-label';
    label.textContent = `${iconStr} ${slotLabel}`;
    card.appendChild(label);

    const val = document.createElement('div');
    val.className = 'hud-armor-slot-value';
    val.textContent = item ? item.name : '[ Unequipped ]';
    card.appendChild(val);

    if (item) {
      card.addEventListener('click', () => {
        this.equipment.unequipArmorSlot(slotKey);
      });
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.equipment.dropEquippedArmor(slotKey);
      });
      card.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
      card.addEventListener('mouseleave', () => this.hideTooltip());
    }

    return card;
  }

  private createWeaponSlotCard(label: string, iconStr: string, item: any): HTMLElement {
    const card = document.createElement('div');
    card.className = `hud-armor-slot-card ${item ? 'filled' : 'empty'}`;

    const lbl = document.createElement('div');
    lbl.className = 'hud-armor-slot-label';
    lbl.textContent = `${iconStr} ${label}`;
    card.appendChild(lbl);

    const val = document.createElement('div');
    val.className = 'hud-armor-slot-value';
    val.textContent = item ? item.name : '[ Empty ]';
    card.appendChild(val);

    if (item) {
      card.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
      card.addEventListener('mouseleave', () => this.hideTooltip());
    }

    return card;
  }

  private createStashSlotElement(item: any, stashIdx: number): HTMLElement {
    const slotEl = document.createElement('div');
    slotEl.className = `hud-inventory-slot ${item ? 'filled' : ''}`;

    if (item) {
      const icon = document.createElement('div');
      icon.className = 'hud-item-icon';
      if (item.name.includes('Helm') || item.name.includes('Hood')) icon.textContent = '🪖';
      else if (item.name.includes('Tunic') || item.name.includes('Doublet') || item.name.includes('Plate')) icon.textContent = '🎽';
      else if (item.name.includes('Trousers') || item.name.includes('Leg')) icon.textContent = '👖';
      else if (item.name.includes('Boots')) icon.textContent = '👢';
      else if (item.name.includes('Gauntlets') || item.name.includes('Bracers')) icon.textContent = '🧤';
      else if (item.name.includes('Bandage')) icon.textContent = '🩹';
      else if (item.name.includes('Potion') || item.name.includes('Elixir')) icon.textContent = '🧪';
      else if (item.type === 'WEAPON') icon.textContent = '⚔️';
      else icon.textContent = '🛡️';

      slotEl.appendChild(icon);

      // Left-click to equip from stash
      slotEl.addEventListener('click', () => {
        this.equipment.equipItemFromStash(stashIdx);
      });

      // Right-click to drop from stash
      slotEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.equipment.dropItemFromStash(stashIdx);
      });

      slotEl.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
      slotEl.addEventListener('mouseleave', () => this.hideTooltip());
    }

    return slotEl;
  }

  private createBeltSlotElement(
    keyLabel: string,
    slotTitle: string,
    item: any,
    isActive: boolean,
    subtext: string | null
  ): HTMLElement {
    const slotEl = document.createElement('div');
    slotEl.className = `hud-equip-slot ${isActive ? 'active' : ''}`;

    const keyBadge = document.createElement('div');
    keyBadge.className = 'hud-equip-keybadge';
    keyBadge.textContent = keyLabel;
    slotEl.appendChild(keyBadge);

    const title = document.createElement('div');
    title.className = 'hud-equip-slottitle';
    title.textContent = slotTitle;
    slotEl.appendChild(title);

    if (item) {
      const icon = document.createElement('div');
      icon.className = 'hud-equip-icon';
      if (item.name.includes('Bandage')) icon.textContent = '🩹';
      else if (item.name.includes('Potion') || item.name.includes('Elixir')) icon.textContent = '🧪';
      else if (item.type === 'WEAPON') icon.textContent = '⚔️';
      else icon.textContent = '🛡️';

      const name = document.createElement('div');
      name.className = 'hud-equip-name';
      name.textContent = item.name;

      slotEl.appendChild(icon);
      slotEl.appendChild(name);

      slotEl.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
      slotEl.addEventListener('mouseleave', () => this.hideTooltip());
    } else {
      const empty = document.createElement('div');
      empty.className = 'hud-equip-empty';
      empty.textContent = '[ Empty ]';
      slotEl.appendChild(empty);
    }

    if (subtext) {
      const sub = document.createElement('div');
      sub.className = 'hud-equip-subtext';
      sub.textContent = subtext;
      slotEl.appendChild(sub);
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

    const actionHint = document.createElement('div');
    actionHint.className = 'hud-tooltip-hint';
    actionHint.textContent = 'L-Click: Equip/Unequip | R-Click: Drop';

    this.tooltipEl.appendChild(name);
    this.tooltipEl.appendChild(desc);
    this.tooltipEl.appendChild(actionHint);

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
